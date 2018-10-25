
let Parse = require('../../parse');

let suser;
/**
 * 1、根据当前user生成二维码  
 * 2、权限情况
 *   a、使用它人权限  （取消按钮）
 *   b、使用自己权限 （扫一扫共享权限按钮，已经共享用户列表） 
 */
var QRCode = require('../../utils/weapp-qrcode.js')
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isShared: false,//是否共享的其它的人权限  根据对比当前用户的curRole来确定
    users: [],
    sharedUser: null,//共享了谁的权限 
    //右滑相关
    toggle: false,//右滑开关
    soUser: null,//正在右滑的user swipeOutUser
    //ActionSheet相关
    asVisible: false,
    asActions: [
      {
        name: '删除',
        color: '#ed3f14'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(`sharedRole:onLoad:options:${JSON.stringify(options)}`)
    if (Parse.User.current()) {
      console.log(`sharedRole:onLoad:currentUser:${Parse.User.current().get('username')}`);
      this._init();
      // this._liveQuery();
    } else {
      console.log(`sharedRole:onLoad:currentUser is null`)
      let app = getApp();
      let that = this;
      app.userReadyCallback = res => {
        console.log(`sharedRole:onLoad:userReadyCallback:${Parse.User.current().get('username')}`)
        that._init();
        // this._liveQuery();
      }
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    if (suser) {
      suser.unsubscribe();
    }
  },

  onShareAppMessage: function (object) {
    console.log(`devices:onShareAppMessage:object:${JSON.stringify(object)}`);
    // path:'/pages/index/index?userId='+ userId, //这里拼接需要携带的参数
    let userId = Parse.User.current() ? Parse.User.current().id : '';
    return {
      title: "分享权限",
      imageUrl: "https://cdn2.jianshu.io/assets/default_avatar/1-04bbeead395d74921af6a4e8214b4f61.jpg?imageMogr2/auto-orient/strip|imageView2/1/w/120/h/120",
      path: '/pages/shareRole/shareRole?userId=' + userId
    }
  },
  /**
   * 扫描添加共享权限给他人
   */
  bindScanToShareTap: function (e) {
    this.setData({
      sharing: true,
    });
    let that = this;
    wx.scanCode({
      success: (res) => {
        console.log(`devices:bindScanToShareTap:success:userId:${res.result}`);
        let userId = res.result;
        that._shareRoleToOtherUser(userId, that)
      },
      fail: (res) => {
        console.log(`devices:bindScanToShareTap:userId:fail:${JSON.stringify(res)}`);
        this.setData({
          sharing: false,
        });
      }
    })
  },

  /**
  * 扫描取消共享
  */
  bindCancelShareTap: function (e) {
    this.setData({
      canceling: true,
    });
    let userId = Parse.User.current().id;
    let that = this;
    Parse.Cloud.run('cancelShareRole', { userId })
      .then(function (result) {
        console.log(`shareRole:bindCancelShareTap:result:${result}`);
        that.setData({ canceling: false });
      }).catch(function (error) {
        console.log(`shareRole:bindCancelShareTap:error:${error}`);
        that.setData({ canceling: false });
      });
  },


  /**
   * ActionSheet取消按钮事件
   */
  handleASCancel: function () {
    this.setData({
      asVisible: false,
      soUser: null,
      toggle: this.data.toggle ? false : true
    });
    console.log(this.data.toggle, 111111111)
  },


  /**
   * 
   */
  handleClickASItem: function ({ detail }) {
    console.log(`shareRole:handleClickASItem:detail:${JSON.stringify(detail)}`);
    const action = [...this.data.asActions];
    action[0].loading = true;

    this.setData({
      asActions: action
    });

    let userId = this.data.soUser.id;
    let that = this;
    Parse.Cloud.run('cancelShareRole', { userId })
      .then(function (result) {
        console.log(`shareRole:handleClickASItem:result:${result}`);
        // that.setData({ canceling: false });
        action[0].loading = false;
        that.setData({
          asVisible: false,
          soUser: null,
          asActions: action,
          toggle: that.data.toggle ? false : true
        });
      }).catch(function (error) {
        console.log(`shareRole:handleClickASItem:error:${error}`);
        action[0].loading = false;
        that.setData({
          asVisible: false,
          soUser: null,
          asActions: action,
          toggle: that.data.toggle ? false : true
        });
      });
  },

  /**
   * swipeOut的删除事件
   */
  soDeleteTapAction(e) {
    let objectId = e.currentTarget.dataset.user;
    console.log(`shareRole:soDeleteTapAction:objectId:${JSON.stringify(objectId)}`);
    //找
    let user = this.data.users.find(function (value, index, arr) {
      return value.id === objectId;
    });
    this.setData({
      asVisible: true,
      soUser: user
    });
  },

  /**
   * 初始化数据
   * 1、获取当前用户
   * 2、根据当前用户ID生成qrcode 
   * 2、根据user.curRole来判断权限情况
   *  a、使用它人权限  isShareing = true
   *  b、使用自己权限  isShareing = true 获取这个权限的所有用户  列表表现
   */
  _init: function () {
    let that = this;
    //1、获取当前用户
    let curUser = Parse.User.current();
    //2、根据当前用户ID生成qrcode 
    this._createQrCode(curUser);
    let curRole = curUser.get('curRole');
    curRole.fetch().then(function (curRole) {
      console.log(`shareRole:_init:curRole:${JSON.stringify(curRole)}`);
      // 2、根据curUser.curRole来判断权限情况 curUser.id 即是role的name 如果不相同 说明是共享别人的权限
      if (curRole.get('name') === curUser.id) {
        return that._dealNoShared(curRole, that, curUser);
      } else {
        return that._dealShared(curRole, that);
      }
    }).catch(function (error) {
      console.log(`shareRole:_init:error:${error}`);
    });
  },

  /**
   * 处理共享别人权限
   * 1、通过curRole获取到sharedUser  user.id 即是role的name
   * 2、添加监听 所括当前用户
   */
  _dealShared: function (curRole, that) {
    let query = new Parse.Query(Parse.User);
    return query.get(curRole.get('name'))
      .then(function (user) {
        that._liveQuery([Parse.User.current().id]);
        that.setData({
          isShared: true,
          sharedUser: user,
          users: [],
        });
      });
  },
  /**
   * 处理未共享他人权限界面
   * 1、获取curRole的users 自己除外
   * 2、添加监听 所括当前用户和curole的users
   */
  _dealNoShared: function (curRole, that, curUser) {
    // create a relation based on the authors key
    var relation = curRole.relation("users");
    // generate a query based on that relation
    var query = relation.query();
    query.notContainedIn("objectId", [curUser.id]);//把当前用户剔除
    return query.find().then(function (results) {
      console.log(`shareRole:_dealNoShared:curRole:users.length:${results.length}`);

      let users = [];
      let liveQueryIds = [Parse.User.current().id];//要监听的用户id
      let actions = [{ key: 'delete', lbl: '取消共享' }];
      for (let i = 0; i < results.length; i++) {
        let user = results[i];
        user.set('open', false);
        user.set('actions', actions);
        users.push(user);
        liveQueryIds.push(user.id)
      }
      //添加监听
      that._liveQuery(liveQueryIds);

      that.setData({
        isShared: false,
        users,
        sharedUser: null,
      });
    });
  },

  /**
   * 根据curUser的id(即objectId)生成二维码
   */
  _createQrCode: function (curUser) {
    //传入wxml中二维码canvas的canvas-id
    var qrcode = new QRCode('userQrcode', {
      // usingIn: this,
      text: curUser.id,
      width: 150,
      height: 150,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  },
  /**
   * 调用cloudCode实现共享权限给他人
   * 然后重新执行_init()方法更新界面 因为共享操作的对象无法确定 无法提前监听到
   */
  _shareRoleToOtherUser: function (userId, that) {

    Parse.Cloud.run('shareRoleToOtherUser', { sourceUserId: Parse.User.current().id, targetUserId: userId })
      .then(function (result) {
        console.log(`shareRole:_shareRoleToOtherUser:result:${JSON.stringify(result)}`);
        if (result.code === 200) {
          that._init();
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
        console.log(`shareRole:_shareRoleToOtherUser:error:${error}`);
        that.setData({
          sharing: false,
        });
      });
  },

  /**
   * 监听 共享操作完成后更新界面
   * 三种情况 
   *  1、未共享他们权限 扫码把权限共享给他人 （无法监听 除非监听整个_User表 直接在共享完成后 执行一次_init()）
   *  2、自己共享他人权限 他人取消 （监听Parse.User.current(),会设置curRole)
   *  3、自己共享他人权限 自己取消 （监听Parse.User.current(),会设置curRole)
   */
  _liveQuery: function (userIds) {
    console.log(`shareRole:_liveQuery:users:${userIds}`);
    if (suser) {
      suser.unsubscribe();
      suser = null;
    }
    let that = this;
    let query = new Parse.Query('_User');
    query.containedIn("objectId", userIds);
    suser = query.subscribe();
    suser.on('open', () => {
      console.log(`shareRole:suser:opened`);
    });
    suser.on('update', (user) => {
      console.log(`shareRole:suser updated1:${user.id}`);
      //有更新 直接update
      that._init();
    });

    suser.on('enter', (user) => {
      console.log(`shareRole:suser:entered:${JSON.stringify(user)}`);
    });

    suser.on('close', () => {
      console.log('shareRole:suser:closed');
    });
  }
})