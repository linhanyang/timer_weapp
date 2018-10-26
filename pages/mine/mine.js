
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
    toggles: [],//左滑开关
    oldExpanded: false,//右滑是否打开
    nextExpanded: false,
    soUser: null,//正在右滑的User
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
    console.log(`mine:onLoad:options:${JSON.stringify(options)}`)
    if (Parse.User.current()) {
      console.log(`mine:onLoad:currentUser:${Parse.User.current().get('username')}`);
      this._init();
      // this._liveQuery();
    } else {
      console.log(`mine:onLoad:currentUser is null`)
      let app = getApp();
      let that = this;
      app.userReadyCallback = res => {
        console.log(`mine:onLoad:userReadyCallback:${Parse.User.current().get('username')}`)
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
    console.log(`mine:onShareAppMessage:object:${JSON.stringify(object)}`);
    // path:'/pages/index/index?userId='+ userId, //这里拼接需要携带的参数
    let user = Parse.User.current();
    let title = `[${user.get('nickName')}]分享权限给您]`;
    let imageUrl = user.get('avatarUrl');
    let path = `/pages/dealShareRole/dealShareRole?userId=${user.id}&avatarUrl=${user.get('avatarUrl')}&nickName=${user.get('nickName')}`
    return {
      title,
      imageUrl,
      path
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
        console.log(`mine:bindScanToShareTap:success:userId:${res.result}`);
        let userId = res.result;
        that._shareRoleToOtherUser(userId, that)
      },
      fail: (res) => {
        console.log(`mine:bindScanToShareTap:userId:fail:${JSON.stringify(res)}`);
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
   * 单击有两种操作
   * 如果是展开状态，关闭展开
   * 如果是关闭状态，跳转
   */
  soCotentTapAction: function (e) {
    console.log(`mine:soCotentTapAction:oldExpanded:${this.data.oldExpanded} nextExpanded:${this.data.nextExpanded}`);
    let oldExpanded = this.data.oldExpanded;
    let nextExpanded = this.data.nextExpanded;

    //因为swipeout的Touchstart,Touchmove,Touchend顺序执行完之后才会执行到content的Tap事件，
    //swipeout在touchend中通过前两个方法中产生的数据计算当前操作是展开还是关半，因此expanded状态的值也是在touchend中改变的
    //因此只有oldExpanded和nextExpanded都为false时，才能说明这个swipeout是真正关闭的，才能跳转
    if (oldExpanded == false && nextExpanded == false) {
      this.setData({
        asVisible: false,
        soUser: null,
      });

      this._closeAllSwipeout();
    }
  },

  /**
   * 获取swipeout展开状态的变化 
   * 有两个值 一个是当前 一个是上一次
   * 通过对比两个值 来确定做什么操作。
   */
  onExpandedChange: function (e) {
    let old = e.detail.oldValue;
    let next = e.detail.nextValue;
    let index = e.currentTarget.dataset.index;
    console.log(`mine:onExpandedChange:old:${old} next:${next} toggles:${this.data.toggles}`);
    this.setData({ oldExpanded: old, nextExpaned: next });
    if (old == false && next == true) {
      this._closeAllSwipeoutExcept(index);
    }
  },

  /**
   * ActionSheet取消按钮事件
   */
  handleASCancel: function () {
    this.setData({
      asVisible: false,
      soUser: null,
    });
    this._closeAllSwipeout();
  },


  /**
   * ActionSheet单击事件 可能有多个操作 
   * 通过detail.index区分 
   * 只有删除
   */
  handleASItemClick: function ({ detail }) {
    console.log(`shareRole:handleClickASItem:detail:${JSON.stringify(detail)}`);
    //先设置转圈
    let index = detail.index;
    let actions = [...this.data.asActions];
    actions[index].loading = true;
    this.setData({
      asActions: actions
    });

    let userId = this.data.soUser.id;
    let that = this;
    Parse.Cloud.run('cancelShareRole', { userId }).then(function (result) {
      console.log(`shareRole:handleClickASItem:result:${result}`);
      //不在转圈
      actions[index].loading = false;
      that.setData({
        asVisible: false,
        soUser: null,
        asActions: actions,
      });
      that._closeAllSwipeout();
    }).catch(function (error) {
      console.log(`shareRole:handleClickASItem:error:${error}`);
      actions[index].loading = false;
      that.setData({
        asVisible: false,
        soGame: null,
        asActions: actions,
      });
      that._closeAllSwipeout();
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
    var relation = curRole.relation("users");
    var query = relation.query();
    query.notContainedIn("objectId", [curUser.id]);//把当前用户剔除
    return query.find().then(function (users) {
      console.log(`shareRole:_dealNoShared:curRole:users.length:${users.length}`);
      let liveQueryIds = [Parse.User.current().id];//要监听的用户id
      let toggles = [];
      users.forEach(user => {
        liveQueryIds.push(user.id);
        toggles.push(false);
      });
      //添加监听
      that._liveQuery(liveQueryIds);
      that.setData({
        isShared: false,
        users,
        usersForView: that._createUsersForView(users),
        sharedUser: null,
      });
    });
  },

  /**
   * wxml中wx:for如果传Parse Object
   * 凡是通过object.get('name')来获取的数据都可能为空 还会报Expect FLOW_CREATE_NODE but get another错误
   * 所以重新生成一usersForView数组，专门用于wxml中显示使用
   */
  _createUsersForView: function (users) {
    let usersForView = [];
    users.forEach(item => {
      //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
      //添加startTimeMills字段，根据startTime的getTime()生成startTimeMills 
      usersForView.push({ objectId: item.id, id: item.id, username: item.get('username'), nickName: item.get('nickName'), avatarUrl: item.get('avatarUrl') })
    });
    return usersForView;
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
   * @param {*} userId 
   * @param {*} that 
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
  },
  /**
   * 关闭所有有的swipeout 除了指定的index
   */
  _closeAllSwipeoutExcept: function (index) {
    console.log(`mine:_closeAllSwipeoutExcept:index:${index} toggles:${this.data.toggles}`);
    let toggles = this.data.toggles;
    for (let i = 0; i < toggles.length; i++) {
      if (i !== index) {
        toggles[i] = toggles[i] ? false : true;
      }
    }
    this.setData({ toggles });
  },
  /**
   * 关闭所有有的swipeout
   */
  _closeAllSwipeout: function () {
    console.log(`mine:_closeAllSwipeout:toggles:${this.data.toggles}`);
    let toggles = this.data.toggles;
    for (let i = 0; i < toggles.length; i++) {
      toggles[i] = toggles[i] ? false : true;;
    }
    this.setData({ toggles });
  },
})