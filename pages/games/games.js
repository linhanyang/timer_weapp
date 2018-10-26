const util = require('../../utils/util.js')
let Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
let sgames;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        loading: false,
        games: [],
        //右滑相关
        toggles: [],//左滑开关
        oldExpanded: false,//右滑是否打开
        nextExpanded: false,
        soGame: null,//正在右滑的Game
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
        console.log(`games:onLoad`);
        if (Parse.User.current()) {
            console.log(`games:onLoad:currentUser:${Parse.User.current().get('username')}`)
            this._fetchGames();
            this._liveQuery();
        } else {
            console.log(`games:onLoad:currentUser is null`)
            let app = getApp();
            let that = this;
            app.userReadyCallback = res => {
                console.log(`games:onLoad:userReadyCallback:${Parse.User.current().get('username')}`)
                that._fetchGames();
                that._liveQuery();
            }
        }
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        if (sgames) {
            sgames.unsubscribe();
        }
    },



    /**
     * 新建按钮事件
     */
    handleCreateGame: function (e) {
        //跳转到editGame的编辑界面
        wx.navigateTo({
            url: `../editGame/editGame`,
        })
    },

    /**
     * 单击有两种操作
     * 如果是展开状态，关闭展开
     * 如果是关闭状态，跳转
     */
    soCotentTapAction: function (e) {
        console.log(`games:soCotentTapAction:oldExpanded:${this.data.oldExpanded} nextExpanded:${this.data.nextExpanded}`);
        let oldExpanded = this.data.oldExpanded;
        let nextExpanded = this.data.nextExpanded;

        //因为swipeout的Touchstart,Touchmove,Touchend顺序执行完之后才会执行到content的Tap事件，
        //swipeout在touchend中通过前两个方法中产生的数据计算当前操作是展开还是关半，因此expanded状态的值也是在touchend中改变的
        //因此只有oldExpanded和nextExpanded都为false时，才能说明这个swipeout是真正关闭的，才能跳转
        if (oldExpanded == false && nextExpanded == false) {
            let objectId = e.currentTarget.dataset.game;
            //跳转到editGame的编辑界面
            wx.navigateTo({
                url: `../viewGame/viewGame?objectId=${objectId}`,
            })

            this.setData({
                asVisible: false,
                soGame: null,
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
        console.log(`games:onExpandedChange:old:${old} next:${next} toggles:${this.data.toggles}`);
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
            soGame: null,
        });
        this._closeAllSwipeout();
    },


    /**
     * ActionSheet单击事件 可能有多个操作 
     * 通过detail.index区分 
     * 只有删除
     */
    handleASItemClick: function ({ detail }) {
        //先设置转圈
        let index = detail.index;
        let actions = [...this.data.asActions];
        actions[index].loading = true;
        this.setData({
            asActions: actions
        });

        //要删除的项已经由SwipeOut的单击事件指定为soGame
        let game = this.data.soGame;
        let that = this;
        game.destroy().then(function (game) {
            //不在转圈
            actions[index].loading = false;
            that.setData({
                asVisible: false,
                soGame: null,
                asActions: actions,
            });
            that._closeAllSwipeout();
        }).catch(function (e) {
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
    soDeleteTapAction: function (e) {
        let objectId = e.currentTarget.dataset.game;
        console.log(`games:soDeleteTapAction:objectId:${JSON.stringify(objectId)}`);
        //找
        let game = this.data.games.find(function (value) {
            return value.id === objectId;
        });
        this.setData({
            asVisible: true,
            soGame: game
        });
    },
    /**
     * 关闭所有有的swipeout 除了指定的index
     */
    _closeAllSwipeoutExcept: function (index) {
        console.log(`games:_closeAllSwipeoutExcept:index:${index} toggles:${this.data.toggles}`);
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
        console.log(`games:_closeAllSwipeout:toggles:${this.data.toggles}`);
        let toggles = this.data.toggles;
        for (let i = 0; i < toggles.length; i++) {
            toggles[i] = toggles[i] ? false : true;;
        }
        this.setData({ toggles });
    },

    _liveQuery: function () {
        let that = this;
        let query = new Parse.Query('Game');
        query.select(['title', 'startTime', 'subTitle'])
        sgames = query.subscribe();
        sgames.on('open', () => {
            console.log(`games:sgames:opened`);
        });
        sgames.on('create', (game) => {
            console.log(`games:sgames created:${JSON.stringify(game.get('title'))}`);
            //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
            //添加startTimeMills字段，根据startTime的getTime()生成startTimeMills 
            game.set('startTimeMills', game.get('startTime').getTime());
            let games = that.data.games;
            let index = games.findIndex(function (value, index, arr) {
                return value.id === game.id;
            });
            //如果没有 说明还没有添加 添加进来
            if (index == -1) {
                games = [game, ...games];
                //toggles也要添加
                let toggles = that.data.toggles;
                toggles = [false, ...toggles];
                that.setData({
                    games,
                    gamesForView: that._createGamesForView(games),
                    toggles,
                })
            }
        });
        sgames.on('update', (game) => {
            console.log(`games:sgames updated1:${JSON.stringify(game.get('title'))}`);
            //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
            //添加startTimeMills字段，根据startTime的getTime()生成startTimeMills 
            game.set('startTimeMills', game.get('startTime').getTime());
            let games = that.data.games;
            let index = games.findIndex(function (value) {
                return value.id === game.id;
            });
            if (index != -1) {
                console.log(`game:SGAMES_UPDATED:game:${game.get('title')}`);
                games.splice(index, 1, game);
                that.setData({
                    games,
                    gamesForView: that._createGamesForView(games),
                });
            }
        });
        sgames.on('delete', (game) => {
            console.log(`games:sgames:deleted:${game.get('title')}`);
            let games = that.data.games;
            //获取被删除game的索引
            let index = games.findIndex(function (value, index, arr) {
                return value.id === game.id;
            });
            if (index != -1) {
                //从games中删除
                games.splice(index, 1);
                //toggles也要添加
                let toggles = that.data.toggles;
                toggles.splice(index, 1);
                that.setData({
                    games,
                    gamesForView: that._createGamesForView(games),
                    toggles,
                });
            }
        });

        sgames.on('close', () => {
            console.log('games:sgames:closed');
        });
    },

    /**
     * wxml中wx:for如果传Parse Object
     * 凡是通过object.get('name')来获取的数据都可能为空 还会报Expect FLOW_CREATE_NODE but get another错误
     * 所以重新生成一gamesForView数组，专门用于wxml中显示使用
     */
    _createGamesForView: function (games) {
        let gamesForView = [];
        games.forEach(item => {
            //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
            //添加startTimeMills字段，根据startTime的getTime()生成startTimeMills 
            gamesForView.push({ objectId: item.id, id: item.id, title: item.get('title'), subTitle: item.get('subTitle'), startTime: item.get('startTime'), startTimeMills: item.get('startTime').getTime() })
        });
        return gamesForView;
    },

    /**
     * 获取game列表
     */
    _fetchGames: function () {
        this.setData({ loading: true });
        let that = this;
        console.log(`games:_fetchGames`);
        let query = new Parse.Query(Game);
        query.select(['title', 'startTime', 'subTitle'])
        query.find().then(function (games) {
            console.log(`games:_fetchGames:games:${JSON.stringify(games)}`);
            ///初始化toggles为全部关闭
            let toggles = [];
            games.forEach(item => {
                toggles.push(false);
            });
            that.setData({
                loading: false,
                games,
                gamesForView: that._createGamesForView(games),
                needReload: false,
                toggles
            });
        });
    }
})