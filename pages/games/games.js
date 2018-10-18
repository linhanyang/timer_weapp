const util = require('../../utils/util.js')
let Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
let sgames;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        startIndex: 0,//下一页获取起始index
        pageSize: 100,//每页大小
        hasMore: true,//是否还有更多
        loading: true,//是否正在加载
        games: []
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
            app.userInfoReadyCallback = res => {
                console.log(`games:onLoad:userInfoReadyCallback:${Parse.User.current().get('username')}`)
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
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {
        if (this.data.startIndex === 0) {
            this._fetchGames();
        }
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {
        this._fetchGames();
    },

    tapDelete: function (e) {
        console.log(`tapDelete:e:${JSON.stringify(e)}`);
        let game = new Game();
        game.id = e.currentTarget.dataset.objectId;
        //删除game
        game.destroy()
            .then(function (game) {
            }, function (error) {
            });
    },

    _liveQuery: function () {
        let that = this;
        let query = new Parse.Query('Game');
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
                let startIndex = that.data.startIndex + 1;
                that.setData({
                    games,
                    startIndex
                })
            }
        });
        sgames.on('update', (game) => {
            console.log(`games:sgames updated1:${JSON.stringify(game.get('title'))}`);
            //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
            //添加startTimeMills字段，根据startTime的getTime()生成startTimeMills 
            game.set('startTimeMills', game.get('startTime').getTime());
            let games = that.data.games;
            let index = games.findIndex(function (value, index, arr) {
                return value.id === game.id;
            });
            if (index != -1) {
                console.log(`game:SGAMES_UPDATED:game:${JSON.stringify(game.get('title'))}`);
                games.splice(index, 1, game);
                that.setData({
                    games
                });
            }
        });

        sgames.on('enter', (game) => {
            console.log(`games:sgames:entered:${JSON.stringify(game)}`);
        });

        sgames.on('delete', (game) => {
            console.log(`games:sgames:deleted:${JSON.stringify(game.get('title'))}`);
            let games = that.data.games;
            //获取被删除game的索引
            let index = games.findIndex(function (value, index, arr) {
                return value.id === game.id;
            });
            if (index != -1) {
                //从games中删除
                games.splice(index, 1);
                let startIndex = that.data.startIndex - 1;
                that.setData({
                    games,
                    startIndex,
                });
            }
        });

        sgames.on('close', () => {
            console.log('game:closed');
        });
    },

    /**
     * 分页获取game列表
     */
    _fetchGames: function () {
        let that = this;
        console.log(`games:_fetchGames`);
        let hasMore = this.data.hasMore;
        let pageSize = this.data.pageSize;
        let startIndex = this.data.startIndex;
        console.log(`games:_fetchGames:hasMore:${hasMore} startIndex:${startIndex} pageSize:${pageSize}`);
        let query = new Parse.Query(Game);
        query.skip(startIndex);
        query.limit(pageSize);
        query.include('screens');
        query.find()
            .then(function (games) {
                console.log(`games:_fetchGames:games:${games && games.length}`);
                //为空或已经到最后一页
                if (games.length === 0) {
                    that.setData({
                        hasMore: false,
                        loading: false,
                    }, function () {
                        console.log(`games:_fetchGames:setDataFinished:noMoreGames`);
                    });
                    return;
                }
                //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
                //添加startTimeMills字段，根据startTime的getTime()生成startTimeMills 
                for (let i = 0; i < games.length; i++) {
                    games[i].set('startTimeMills', games[i].get('startTime').getTime());
                }
                startIndex = startIndex + pageSize;
                if (games.length < pageSize) {
                    hasMore = false;
                    startIndex = games.length;
                }
                console.log(`games:_fetchGames:startIndex:${startIndex}`);
                that.setData({
                    startIndex: startIndex,
                    pageSize: pageSize,
                    hasMore: hasMore,
                    loading: false,
                    games: [...that.data.games, ...games]
                }, function () {
                    console.log(`games:_fetchGames:setDataFinished`);
                });
            }, function (error) {
                console.error(error);
            });
    }
})