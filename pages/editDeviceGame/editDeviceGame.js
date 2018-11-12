var Parse = require('../../parse');
let DeviceRole = Parse.Object.extend("DeviceRole");
let Game = Parse.Object.extend("Game");
const TYPES = [{ key: 'normal', lbl: '正常' }, { key: 'withreward', lbl: '带奖池' }];
Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceRole: {},
    types: TYPES,
    type: { key: 'normal', lbl: '正常' },
    typeIndex: 0, 
    games: [],
    gameIndex: 0,
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let id = options.deviceRoleId;
    console.log(`editDeviceGame:onLoad:id:${id}`);
    this._init(id);
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  bindGameChange: function (e) {
    let index = e.detail.value;
    let games = this.data.games;
    let game;
    if (index !== -1 && index < games.length) {
      game = games[index];
    }

    if (game) {
      this.setData({
        gameIndex: index,
        game,
        gameError: null,
      })
    }
  },

  bindTypeChange: function (e) {
    let index = e.detail.value;
    let types = this.data.types;
    let type = types[index];
    this.setData({
      typeIndex: index,
      type,
      typeError: null,
    })
  },

  bindErrorTip: function (e) {
    let id = e.currentTarget.id;
    let error = this.data.gameError;
    console.log(`editGame:bindErrorTip:error:${error}`);
    wx.showToast({
      title: error,
      icon: 'none',
      duration: 2000
    })
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
   * 初始化 
   * 1、先获取games
   * 2、再获取deviceRole
   * 3、再跟据device中的type,确认typeIndex
   * 4、再跟据deviceRole中的gameId,确认gameIndex
   * @param {*} objectId 
   */
  _init: function (objectId) {
    //1、先获取games
    let that = this;
    let query = new Parse.Query(Game);
    let _games;
    query.descending('_created_at');
    query.select('title');
    query.find().then(function (games) {
      if (games) {
        let nullGame = { id: '0', title: '不推送任何比赛' };
        games.splice(0, 0, nullGame);
      } else {
        games = [nullGame];
      }
      _games = games;
      //2、再获取deviceRole
      let query = new Parse.Query(DeviceRole);
      query.include('device');
      return query.get(objectId)
    }).then(function (deviceRole) {
      console.log(`editDeviceGame:_init:deviceRole:${deviceRole.id}`);
      //微信wxml中只能获取子 不能获取孙 
      let uuid = deviceRole.get('device').get('uuid');
      deviceRole.set('uuid', uuid);

      // 3、再跟据device中的type,确认typeIndex
      let device = deviceRole.get('device');
      let typeStr = device.get('type');
      let type = TYPES[0];
      let typeIndex = 0;
      console.log(`editDeviceGame:_init:device:type:${typeStr}`);
      if (typeStr) {
        if (typeStr === 'withreward') {
          typeIndex = 1;
          type = TYPES[1];
        } else {
          typeIndex = 0;
          type = TYPES[0];
        }
      } else {
        typeIndex = 0;
        type = TYPES[0];
      }

      //4、再跟据deviceRole中的gameId,确认gameIndex
      let gameIndex = 0;
      let game = deviceRole.get('device').get('game');
      if (game) {
        gameIndex = _games.findIndex(function (value) {
          return value.id === game.id;
        });
        if (gameIndex < 0)
          gameIndex = 0;
      }

      console.log(`editDeviceGame:_init:gameIndex:${gameIndex}`);
      that.setData({
        deviceRole,
        games: _games,
        gameIndex,
        game:_games[gameIndex],
        type,
        typeIndex,
      });
    }).catch(function (error) {
      console.error(`editDeviceGame:_init:error:${error}`)
    });
  },
  /**
   * 1、保存显示类型到device中
   * 2、判断是不是不推送任何比赛
   *  2.1、不推送比赛相当于解绑， 要获取一下game
   *  2.2、推送比赛 即是绑定比赛
   */
  _update() {
    let that = this;
    // 1、保存显示类型到device中
    let deviceRole = this.data.deviceRole;
    let game = this.data.game;
    let device = deviceRole.get('device');
    let type = this.data.type;
    device.save({ type: type.key }).then(function (device) {
      console.log(`editDeviceGame:_update:device:type:${device.get('type')}`);
      //2、判断是不是不推送任何比赛
      if (game.id == '0') {
        //2.1、不推送比赛相当于解绑， 要获取一下game
        game = device.get('game');
        that._unbindDeviceToGame(device, game);
      } else {
        //2.2、推送比赛 即是绑定比赛
        that._bindDeviceToGame(device, game);
      }
    })
  },

  /**
   * 绑定大屏幕到Game
   * @param {*} game
   * @param {*} device
   */
  _bindDeviceToGame(device, game) {
    let that = this;
    //一个大屏幕只能被一个game使用。已经被其它的game使用了 先删除
    let oldGame = device.get('game');
    if (oldGame) {
      console.log(`editDeviceGame:_bindDeviceToGame:oldGame:${oldGame && oldGame.get('title')}`);
      let screens = oldGame.get('screens');
      if (screens && screens.length > 0) {
        //看看存不存在
        let index = screens.findIndex(function (value, index, arr) {
          return value.id === device.id;
        });
        console.log(`editDeviceGame:_bindDeviceToGame:oldGame:index:${index}`);
        //如果存在 删除后保存
        if (index != -1) {
          screens.splice(index, 1);
          oldGame.set('screens', screens);
          //判断还有没有screens 如果已经没有了 删除screen（角色)读取此game的权限
          if (!screens || screens.length === 0) {
            let gameAcl = oldGame.get('ACL');
            gameAcl.setRoleReadAccess('screen', false);
            gameAcl.setRoleWriteAccess('screen', false);
          }
          oldGame.save();
        }
      }
    }
    //要先把device绑定到game中screens 并授权给screen角色可以访问此game。不然device一旦save
    //大屏幕上会触发添加此game的liveQuery 没有授权就会出错

    //设置game的ACL,让screen（角色）能访问这个game
    let gameAcl = game.get('ACL');
    gameAcl.setRoleReadAccess('screen', true);
    gameAcl.setRoleWriteAccess('screen', true);
    //处理Screens
    let screens = game.get('screens');
    if (!screens) {
      screens = [];
      screens.push(device);
    } else {
      //看看存不存在
      let index = screens.findIndex(function (value, index, arr) {
        return value.id === device.id;
      });
      //存在替换 不存在push
      if (index !== -1)
        screens.splice(index, 1, device);
      else
        screens.push(device);
    }
    // console.log(`editDeviceGame:_bindDeviceToGame:editDeviceGame:${JSON.stringify(screens)}`);
    game.set('screens', screens);
    game.save().then(function (game) {
      device.set('game', game);
      return device.save();
    }).then(function (device) {
      console.log(`editDeviceGame:_bindDeviceToGame:device1:${device && device.get('uuid')}`);
      // 通知上一页重新获取数据 并返回上一页
      that.setData({
        saving: false,
      });
      that._notifyPrevPage();
      wx.navigateBack({
        delta: 1
      })
    }).catch(function (error) {
      console.log(`editDeviceGame:_bindDeviceToGame:error:${error}`);
    })
  },
  /**
   * 解除绑定到Game的大屏幕
   * @param {*} uuid
   */
  _unbindDeviceToGame(device, game) {
    let that = this;
    console.log(`editDeviceGame:_unbindDeviceToGame:uuid:${device && device.get('uuid')} `);
    device.set('game', null);
    device.save().then(function (device) {
      console.log(`editDeviceGame:_unbindDeviceToGame:device:${device && device.get('uuid')}`);
      let screens = game.get('screens');
      if (screens) {
        //看看存不存在
        let index = screens.findIndex(function (value) {
          return value.id === device.id;
        });
        //如果存在 删除后保存
        if (index != -1) {
          screens.splice(index, 1);
          game.set('screens', screens);
          //判断还有没有screens 如果已经没有了 删除screen（角色)读取此game的权限
          let gameAcl = game.get('ACL');
          gameAcl.setRoleReadAccess('screen', false);
          gameAcl.setRoleWriteAccess('screen', false);
          return game.save();
        }
      }
    }).then(function (game) {
      console.log(`editDeviceGame:_unbindDeviceToGame:game:${game && game.get('title')}`);
      // 通知上一页重新获取数据 并返回上一页
      that.setData({
        saving: false,
      });
      that._notifyPrevPage();
      wx.navigateBack({
        delta: 1
      })
    }, function (error) {
      console.log(`editDeviceGame:_unbindDeviceToGame:error:${error}`);
    })
  },
  /**
   * 提交之前 验证所有表单项
   */
  _validateAll: function () {
    let result = false;
    //验证是否已经选中了game
    let game = this.data.game;
    if (!game) {
      this.setData({
        gameError: '请选择比赛',
      })
    }

    //所有验证结果都为空  说明验证通过
    let gameError = this.data.gameError;
    if (!gameError)
      result = true;

    return result;
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
      console.log(`editDeviceGame:_notifyPrevPage:setDataFinished`);
    });
  },
})