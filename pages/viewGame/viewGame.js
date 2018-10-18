// pages/viewGame/viewGame.js
var Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
let sgame;
Page({
    /**
     * 页面的初始数据
     */
    data: {
        game: {},
        currentRoundIndex: -1,
        status: ''
    },
    customData: {
        sgame: {}//liveQuery
    },
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        console.log(`viewGame:onLoad:objectId:${options.objectId}`)
        this._fetchGame(options.objectId);

        let that = this;
        let query = new Parse.Query(Game);
        query.equalTo('objectId', options.objectId);
        sgame = query.subscribe();
        sgame.on('open', () => {
            console.log(`game:sgame:opened:${JSON.stringify(sgame)}`);
        });
        sgame.on('update', (game) => {
            //有疑问 之前解决  为什么还要_fetchGame一次
            console.log(`game:sgame updated1:${game && game.title}`);
            that._fetchGame(game.id);
        });

        sgame.on('delete', (game) => {
            console.log(`game:sgame:deleted:${game && game.title}`);
            // dispatch({ type: SGAME_DELETED }); 
            //that.setData({ game: game });
            wx.navigateBack();
        });

        sgame.on('close', () => {
            console.log('game:closed');
        });
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
    * 监听组件countdown的currentRoundIndexChange事件
    */
    onCurrentRoundIndexChange: function (e) {
        this.setData({ currentRoundIndex: e.detail.currentRoundIndex }, function () {
            console.log(`viewGame:onCurrentRoundIndexChange:currentRoundIndex:${this.data.currentRoundIndex}`);
        });
    },

    /**
    * 监听组件countdown的statusChange事件
    */
    onStatusChange: function (e) {
        this.setData({ status: e.detail.status }, function () {
            console.log(`viewGame:onStatusChange:status:${this.data.status}`);
        });
    },

    /**
    * 监听组件countdown的statusChange事件
    */
    onBreakingChange: function (e) {
        this.setData({ breaking: e.detail.breaking }, function () {
            console.log(`viewGame:onBreakingChange:breaking:${this.data.breaking}`);
        });
    },
    /**
    * 监听组件countdown的pause事件
    */
    onPause: function (e) {
        console.log(`viewGame:onPause`)
        let game = this.data.game;
        game.set('pauseTime', new Date())
        this._updateGame(game);
    },
    /**
    * 监听组件countdown的resume事件
    */
    onResume: function (e) {
        console.log(`viewGame:onResume`)
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
        console.log(`viewGame:onStartImmediate`)
        let game = this.data.game;
        game.set('startTime', new Date())
        this._updateGame(game);
    },

    /**
    * 从指定级别开始执行
    */
    onStartLevel: function (e) {
        let level = e.detail.level;
        console.log(`viewGame:onStartLevel:level:${level}`);
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
                console.log(`viewGame:onStartLevel:index:${index}`);
                if (index != -1) {
                    //把index之前级别的时长相加
                    let duration = 0;
                    for (let i = 0; i < index; i++) {
                        let round = rounds[i];
                        console.log(`viewGame:onStartLevel:round.duration:${round.duration} round.breakDuration:${round.breakDuration}`);
                        if (!round.breakDuration || round.breakDuration === 0) {
                            duration += parseInt(round.duration);
                        } else {
                            duration += parseInt(round.duration) + parseInt(round.breakDuration);
                        }
                    }
                    //当前时间减去相加的时间就是开始时间
                    let startTime = new Date().getTime() - duration * 60 * 1000;
                    console.log(`viewGame:onStartLevel:duration:${duration} startTime:${startTime}`);
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
        console.log(`viewGame:onDelete:level:${level}`);
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
    /**
    * 添加或减少rebuy次数 addon次数 玩家人数
    */
    onActionTap: function (e) {
        let action = e.detail.action;
        let props = e.detail.props;

        let game = this.data.game;
        if ('subtract' === action) {
            let value = game.get(props);
            if (value)
                value = value - 1;
            else
                value = 0;
            if (value < 0)
                value = 0;
            game.set(props, value);
        } else if ('add' === action) {
            let value = game.get(props);
            if (value)
                value = value + 1;
            else
                value = 1;
            game.set(props, value);
        }
        //更新game
        this._updateGame(game);
    },
    kindToggle: function (e) {
        var id = e.currentTarget.id, list = this.data.list;
        for (var i = 0, len = list.length; i < len; ++i) {
            if (list[i].id == id) {
                list[i].open = !list[i].open
            } else {
                list[i].open = false
            }
        }
        this.setData({
            list: list
        });
    },
    /**
     * 根据ID获取game详情
     */
    _fetchGame: function (objectId) {
        console.log(`viewGame:_fetchGame:objectId:${objectId}`);
        let that = this;
        let query = new Parse.Query(Game);
        query.include('screens');
        query.get(objectId).then(function (game) {
            //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
            //添加startTimeMills、pauseTimeMills字段，根据startTime、pauseTime的getTime()生成startTimeMills
            game.set('startTimeMills', game.get('startTime').getTime());
            if (game.get('pauseTime')) {
                game.set('pauseTimeMills', game.get('pauseTime').getTime());
            }

            that.setData({ game: game }, function () {
                console.log(`viewGame:_fetchGame:setDataFinished:startTime:${game.get('startTime').getTime()}`);
            });
        }, function (error) {
            console.error(error);
        })
    },
    
    _updateGame: function (game) {
        //这两个属性不需要保存到服务器
        game.unset('pauseTimeMills');
        game.unset('startTimeMills');
        game.save().then(function (game) {
            console.log(`viewGame:_updateGame::${game.id}`)
        }, function (error) {
            console.error(`viewGame:error:${JSON.stringify(error)}`)
        });
    }
})