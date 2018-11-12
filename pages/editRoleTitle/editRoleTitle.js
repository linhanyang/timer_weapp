var Parse = require('../../parse');
let Role = Parse.Object.extend("_Role");
Page({

  /**
   * 页面的初始数据
   */
  data: {
    role: {},
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let id = options.roleId;
    console.log(`editRoleTitle:onLoad:id:${id}`);
    this._fetchRole(id);
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
    console.log(`editRoleTitle:_validateInput`)
    let error = null;
    if (!value || value.length === 0) {
      error = "名称不能为空"
    } else if (value.length > 100) {
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
   * 根据ID获取role详情
   */
  _fetchRole: function (objectId) {
    console.log(`editRoleTitle:_fetchRole:objectId:${objectId}`);
    let that = this;
    let query = new Parse.Query(Role);
    query.get(objectId).then(function (role) {
      console.log(`editRoleTitle:_fetchRole:role:${role.id}`);
      that.setData({ role: role }, function () {
        console.log(`editRoleTitle:_fetchRole:setDataFinished`);
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
    let role = this.data.role;
    let title = this.data.title;

    role.save({ title }).then(function (role) {
      console.log(`editRoleTitle:_update::title：${title}`);
      that.setData({
        saving: false,
      });
      that._notifyPrevPage();
      wx.navigateBack({
        delta: 1
      })
    }, function (error) {
      console.log(`editRoleTitle:_update:error:${JSON.stringify(error)}`)
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
      console.log(`editRoleTitle:_notifyPrevPage:setDataFinished`);
    });
  },
})