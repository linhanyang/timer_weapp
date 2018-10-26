
let Parse = require('../../parse');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    sharing: false,
    userId: '',
    avatarUrl: '',
    nikeName: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(`dealShareRole:onLoad:options:${JSON.stringify(options)}`);
    if (Parse.User.current()) {
      this._init(this, options);
    } else {
      console.log(`dealShareRole:is null`)
      let app = getApp();
      let that = this;
      app.userReadyCallback = res => {
        this._init(that, options);
      }
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },
  /**
   * 确定后共享权限给他人
   * 1、共享权限
   * 2、成功能延时跳转
   * @param {*} e 
   */
  onComfirmTap: function (e) {
    this.setData({
      sharing: true,
    });
    let userId = this.data.userId;
    let that = this;
    Parse.Cloud.run('shareRoleToOtherUser', { sourceUserId: userId, targetUserId: Parse.User.current().id })
      .then(function (result) {
        console.log(`dealShareRole:shareRoleToOtherUser:result:${JSON.stringify(result)}`);
        if (result.code === 200) {
          that.setData({
            sharing: false,
          });
          // 2、延时跳转
          setTimeout(function () {
            wx.switchTab({
              url: '../games/games'
            });
          }, 500);
        } else {
          wx.showToast({
            title: result.msg,
            icon: 'none',
            duration: 2000
          })
        }
        that.setData({
          sharing: false,
        });
      }).catch(function (error) {
        console.log(`dealShareRole:shareRoleToOtherUser:error:${error}`);
        that.setData({
          sharing: false,
        });
      });
  },
  onCancelTap: function (e) {
    wx.switchTab({
      url: '../games/games'
    });
  },
  _init: function (that, options) {
    let userId = options.userId;
    let avatarUrl = options.avatarUrl;
    let nickName = options.nickName;
    let tips = `[${nickName}]给您授权，如您接受，将拥有他在hulu计时器中的大部分权限，比如新建、删除、修改比赛、操作盲注结构、操作大屏幕等。`
    that.setData({ userId, avatarUrl, nickName, tips });
  }
})