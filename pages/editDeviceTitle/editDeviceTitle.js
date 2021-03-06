var Parse = require('../../parse');
let DeviceRole = Parse.Object.extend("DeviceRole");
Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceRole: {},
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let id = options.deviceRoleId;
    console.log(`editDeviceTitle:onLoad:id:${id}`);
    this._fetchDeviceRole(id);
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
   * 根据ID获取deviceRole详情
   */
  _fetchDeviceRole: function (objectId) {
    console.log(`editDeviceTitle:_fetchDeviceRole:objectId:${objectId}`);
    let that = this;
    let query = new Parse.Query(DeviceRole);
    query.include('rounds');
    query.get(objectId).then(function (deviceRole) {
      console.log(`editDeviceTitle:_fetchDeviceRole:deviceRole:${deviceRole.id}`);
      //微信wxml中只能获取子 不能获取孙 
      let uuid = deviceRole.get('device').get('uuid');
      deviceRole.set('uuid', uuid);
      that.setData({ deviceRole: deviceRole }, function () {
        console.log(`editDeviceTitle:_fetchDeviceRole:setDataFinished`);
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
    let deviceRole = this.data.deviceRole;
    let title = this.data.title;
    
    //删除只展示的属性 不保存到数据库
    deviceRole.uuid = undefined;
    deviceRole.label = undefined;
    delete deviceRole.uuid;
    delete deviceRole.label;

    deviceRole.save({ title }).then(function (deviceRole) {
      console.log(`editDeviceTitle:_update::title：${title}`);
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