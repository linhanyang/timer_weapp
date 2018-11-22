const util = require('../../utils/util.js')
var Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
let sgame;
Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    game: undefined,
    currentRoundIndex: -1,
    status: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(`viewGame_:onLoad:objectId:${options.objectId}`)
    this._fetchGame(options.objectId);
  },


  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

    if (sgame) {
      sgame.unsubscribe();
    }
  },
  /**
    * 添加或减少 玩家人数 等属性
    */
  onActionTap: function (e) {
    let action = e.detail.action;
    let props = e.detail.props;
    let value = e.detail.value;

    console.log(`viewGame_:onActionTap:action:${action} value:${value} props:${props}`);
    let game = this.data.game;
    switch (action) {
      case 'subtract': {
        let value = game.get(props);
        if (value)
          value = value - 1;
        else
          value = 0;
        if (value < 0)
          value = 0;
        game.set(props, value);
      }
        break;
      case 'add': {
        let value = game.get(props);
        if (value)
          value = value + 1;
        else
          value = 1;
        game.set(props, value);
      }
        break;
      case 'change': {
        game.set(props, value);
      }
        break;
      default:
        break;
    }
    //更新game
    this._updateGame(game);
  },
  /**
  * 更新chips
  */
  onActionTapChips: function (e) {
    let chipss = e.detail.chipss;
    console.log(`viewGame_chipssnActionTap:chipss:${chipss} `);
    let game = this.data.game;
    game.set('chipss', chipss);
    //更新game
    this._updateGame(game);
  },


  /**
  * 监听组件countdown的currentRoundIndexChange事件
  */
  onCurrentRoundIndexChange: function (e) {
    this.setData({ currentRoundIndex: e.detail.currentRoundIndex }, function () {
      console.log(`viewGame_:onCurrentRoundIndexChange:currentRoundIndex:${this.data.currentRoundIndex}`);
    });
  },

  /**
  * 监听组件countdown的statusChange事件
  */
  onStatusChange: function (e) {
    this.setData({ status: e.detail.status }, function () {
      console.log(`viewGame_:onStatusChange:status:${this.data.status}`);
    });
  },

  /**
  * 监听组件countdown的pause事件
  */
  onPause: function (e) {
    console.log(`viewGame_:onPause`)
    let game = this.data.game;
    game.set('pauseTime', new Date())
    this._updateGame(game);
  },
  /**
  * 监听组件countdown的resume事件
  */
  onResume: function (e) {
    console.log(`viewGame_:onResume`)
    let game = this.data.game;
    //求出当前时间和pausetime的时间差  
    let pauseTime = game.get('pauseTime').getTime();
    let pauseDuration = Date.now() - pauseTime;
    console.log(`view:resume:pauseDuration${pauseDuration}`);

    //让开始时间推迟
    let startTime = new Date(game.get('startTime').getTime() + pauseDuration);
    //设置pauseTime
    game.set('startTime', startTime);
    game.set('pauseTime', null);
    // game.unset('pauseTime');
    this._updateGame(game);
  },
  /**
  * 监听组件countdown的startImmediate事件
  */
  onStartImmediate: function (e) {
    console.log(`viewGame_:onStartImmediate`)
    let game = this.data.game;
    game.set('startTime', new Date());
    this._updateGame(game);
  },

  /**
  * 从指定级别开始执行
  */
  onStartLevel: function (e) {
    let level = e.detail.level;
    console.log(`viewGame_:onStartLevel:level:${level}`);
    //startLevel步骤
    //获取级别index 
    //把index之前级别的时长相加
    //当前时间减去相加的时间就是开始时间
    let game = this.data.game;
    if (game && game.get('rounds')) {
      let rounds = game.get('rounds')
      if (level >= 1 && level <= rounds.length) {
        //获取级别index 
        let index = rounds.findIndex(function (value, index, arr) {
          return value.level === level;
        });
        console.log(`viewGame_:onStartLevel:index:${index}`);
        if (index != -1) {
          //把index之前级别的时长相加
          let duration = 0;
          for (let i = 0; i < index; i++) {
            let round = rounds[i];
            console.log(`viewGame_:onStartLevel:round.duration:${round.duration} round.breakDuration:${round.breakDuration}`);
            if (!round.breakDuration || round.breakDuration === 0) {
              duration += parseInt(round.duration);
            } else {
              duration += parseInt(round.duration) + parseInt(round.breakDuration);
            }
          }
          //当前时间减去相加的时间就是开始时间
          let startTime = new Date().getTime() - duration * 60 * 1000;
          console.log(`viewGame_:onStartLevel:duration:${duration} startTime:${startTime}`);
          game.set('startTime', new Date(startTime))
          this._updateGame(game);
        }
      }
    }
  },
  /**
  * 删除此级别
  */
  onDelete: function (e) {
    let level = e.detail.level;
    console.log(`viewGame_:onDelete:level:${level}`);
    //delete 三部分 
    //小于selectedIndex 不处理
    //等于selectedIndex 删除 
    //大于selectedIndex level-1 
    let game = this.data.game;
    if (game && game.get('rounds')) {
      let rounds = game.get('rounds')
      //范围
      if (level >= 1 && level <= rounds.length) {
        //删除  看看level存不存在
        let index = rounds.findIndex(function (value, index, arr) {
          return value.level === level;
        });
        if (index != -1) {
          //删除
          rounds.splice(index, 1);
          //大于selectedIndex level- 1 
          for (let i = index; i < rounds.length; i++) {
            let round = rounds[i];
            round.level = round.level - 1;
          }
          //更新game
          this._updateGame(game);
        }
      }
    }
  },

  onRewardClicked: function (e) {
    //跳转到editDeviceGame
    wx.navigateTo({
      url: `../editGameReward/editGameReward?gameId=${this.data.game.id}`,
    })
  },
  onNotificationClicked: function (e) {
    //跳转到editDeviceGame
    wx.navigateTo({
      url: `../editGameNotification/editGameNotification?gameId=${this.data.game.id}`,
    })

  },
  _subscribeGame: function () {
    //如果已经存在说已经监听 先取消监听
    if (sgame) {
      sgame.unsubscribe();
      sgame = undefined;
    }
    //修改成_fetctGame成功后执行 故 this.data.game已经存在
    let game = this.data.game;
    if (game) {
      let that = this;
      let query = new Parse.Query(Game);
      query.equalTo('objectId', game.id);
      sgame = query.subscribe();
      sgame.on('open', () => {
        console.log(`viewGame_:sgame:opened:`);
      });
      sgame.on('update', (game) => {
        console.log(`viewGame_:sgame updated1:${game && game.get('title')}`);
        //因为wxml中对ParseObject对象兼容不好 生成一个gameForView专门给wxml使用
        that.setData({ game, gameForView: that._createGameForView(game) });
      });

      sgame.on('delete', (game) => {
        console.log(`viewGame_:sgame:deleted:${game && game.get('title')}`);
        wx.navigateBack();
      });

      sgame.on('close', () => {
        console.log('viewGame_:sgame:closed');
      });
    }
  },

  /**
   * 更新Game到parse
   * 然后通过liveQuerry监听改变
   */
  _updateGame: function (game) {
    //这两个属性不需要保存到服务器
    game.unset('pauseTimeMills');
    game.save().then(function (game) {
      console.log(`viewGame_:_updateGame::${game.id}`)
    }, function (error) {
      console.error(`viewGame_:error:${JSON.stringify(error)}`)
    });
  },
  /**
   * 根据ID获取game详情
   */
  _fetchGame: function (objectId) {
    console.log(`viewGame_:_fetchGame:objectId:${objectId}`);

    this.setData({ loading: true });
    let that = this;
    let query = new Parse.Query(Game);
    query.get(objectId).then(function (game) {
      console.log(`viewGame_:_fetchGame:startTime:${game && game.get('startTime')}`);
      that.setData({ game, gameForView: that._createGameForView(game), loading: false }, function () {
        console.log(`viewGame_:_fetchGame:setDataFinished:game:startTime:${game.get('startTime')}`);
        this._subscribeGame();
      });
    }).catch(function (error) {
      that.setData({ loading: false });
      console.error(error);
    });
  },

  /**
   * wxml中wx:for如果传Parse Object
   * 凡是通过object.get('name')来获取的数据都可能为空 还会报Expect FLOW_CREATE_NODE but get another错误
   * 所以重新生成一gameForView对象，专门用于wxml中显示使用
   */
  _createGameForView: function (game) {
    let reward = game.get('reward');
    if (reward) {
      let rewards = reward.split('\n');
      if (rewards.length > 1) {
        reward = rewards[0] + " ..."
      }
    }


    let notification = game.get('notification');
    if (notification) {
      let notifications = notification.split('\n');
      if (notifications.length > 1) {
        notification = notifications[0] + " ..."
      }
    }


    let startTime4View = game.get('startTime4View');
    if (!startTime4View)
      startTime4View = game.get('startTime');
    startTime4View = util.formatDateTimeShort(startTime4View)

    let gameForView = {
      //id
      id: game.id,
      objectId: game.id,
      //desc
      title: game.get('title'),
      startTime4View,
      //传递date对象 在组件countdown 某些手机读取不到。所以直接传基本类型的number
      startTime: game.get('startTime').getTime(),
      players: game.get('players'),
      restPlayers: game.get('restPlayers'),
      rewardPlayers: game.get('rewardPlayers'),
      reward: reward,
      notification: notification,
      rounds: game.get('rounds'),
      chipss: game.get('chipss'),
    };
    if (game.get('pauseTime')) {
      gameForView = { ...gameForView, pauseTime: game.get('pauseTime').getTime() };
    }
    
    console.log(`viewGame_:_createGameForView:startTime:${gameForView && gameForView.startTime}`);
    return gameForView;
  }
})