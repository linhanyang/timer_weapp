var Parse = require('../../parse');
let DeviceUser = Parse.Object.extend("DeviceUser");
Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceUser: {},
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let id = options.deviceUserId;
    console.log(`editDeviceTitle:onLoad:id:${id}`);
    this._fetchDeviceUser(id);
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  bindTitleBlur: function (e) {
    let value = e.detail.value;
    this._validateTitleInput(value);
  },

  bindErrorTip: function (e) {
    let id = e.currentTarget.id;
    let error;
    switch (id) {
      case 'title': {
        error = this.data.titleError;
      } break;
    }
    wx.showToast({
      title: error,
      icon: 'none',
      duration: 2000
    })
  },

  /**
   * 验证input输入是否正确
   */
  _validateTitleInput: function (value) {
    console.log(`editDeviceTitle:_validateInput`)
    let error = null;
    if (!value || value.length === 0) {
      error = "名称不能为空"
    } else if (value.length > 10) {
      error = "模板名称太长"
    }
    this.setData({
      title: value,
      titleError: error,
    });
  },
  /**
   * 提交之前 验证所有表单项
   */
  _validateAll: function () {
    let result = false;

    //验证输入框
    let title = this.data.title;
    this._validateTitleInput(title);

    //所有验证结果都为空  说明验证通过
    let titleError = this.data.titleError;
    if (!titleError) {
      result = true;
    }
    return result;
  },

  bindSubmitTap: function (e) {
    let that = this;
    that.setData({
      saving: true,
    });
    if (this._validateAll()) {
      this._update();
    } else {
      that.setData({
        saving: false,
      });
    }
  },
  /**
   * 根据ID获取deviceUser详情
   */
  _fetchDeviceUser: function (objectId) {
    console.log(`editDeviceTitle:_fetchDeviceUser:objectId:${objectId}`);
    let that = this;
    let query = new Parse.Query(DeviceUser);
    query.include('rounds');
    query.get(objectId).then(function (deviceUser) {
      console.log(`editDeviceTitle:_fetchDeviceUser:deviceUser:${deviceUser.id}`);
      //微信wxml中只能获取子 不能获取孙 
      let uuid = deviceUser.get('device').get('uuid');
      deviceUser.set('uuid', uuid);
      that.setData({ deviceUser: deviceUser }, function () {
        console.log(`editDeviceTitle:_fetchDeviceUser:setDataFinished`);
      });
    }, function (error) {
      console.error(error);
    })
  },
  /**
   * 编辑
   */
  _update() {
    let that = this;
    let deviceUser = this.data.deviceUser;
    let title = this.data.title;
    
    //删除只展示的属性 不保存到数据库
    deviceUser.uuid = undefined;
    deviceUser.label = undefined;
    deviceUser.title1 = undefined;
    delete deviceUser.uuid;
    delete deviceUser.uuid;
    delete deviceUser.title1;

    deviceUser.save({ title }).then(function (deviceUser) {
      console.log(`editDeviceTitle:_update::${JSON.stringify(deviceUser)}`);
      that.setData({
        saving: false,
      });
      that._notifyPrevPage();
      wx.navigateBack({
        delta: 1
      })
    }, function (error) {
      console.log(`editDeviceTitle:_update:error:${JSON.stringify(error)}`)
    });
  },
  /**
    * 通知列表重新获取盲注模板列表
    */
  _notifyPrevPage: function () {
    var pages = getCurrentPages();
    var currPage = pages[pages.length - 1];   //当前页面
    var prevPage = pages[pages.length - 2];  //上一个页面
    //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
    prevPage.setData({
      needReload: true,
    }, function () {
      console.log(`editDeviceTitle:_notifyPrevPage:setDataFinished`);
    });
  },
})