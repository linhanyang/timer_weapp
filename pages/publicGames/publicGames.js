const util = require('../../utils/util.js')
let Parse = require('../../parse');
let Game = Parse.Object.extend("PublicGame");
let sgames;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        startIndex: 0,//下一页获取起始index
        pageSize: 2,//每页大小
        hasMore: true,//是否还有更多
        loading: true,//是否正在加载
        games: []
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        let that = this;
        this._fetchGames();
        let query = new Parse.Query(Game);
        sgames = query.subscribe();
        sgames.on('open', () => {
            console.log(`publicGames:sgames:opened`);
        });
        sgames.on('create', (game) => {
            console.log(`publicGames:sgames created:${JSON.stringify(game.get('title'))}`);

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
            console.log(`publicGames:sgames updated1:${JSON.stringify(game.get('title'))}`);
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
            console.log(`publicGames:sgames:entered:${JSON.stringify(game)}`);
        });

        sgames.on('delete', (game) => {
            console.log(`publicGames:sgames:deleted:${JSON.stringify(game.get('title'))}`);
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
            console.log('publicGames:sgames:closed');
        });
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
        console.log(`publicGames:tapDelete:e:${JSON.stringify(e)}`);
        let game = new Game();
        game.id = e.currentTarget.dataset.objectId;
        //删除game
        game.destroy()
            .then(function (game) {
            }, function (error) {
            });
    },

    /**
     * 分页获取game列表
     */
    _fetchGames: function () {
        let that = this;
        console.log(`publicGames:onLoad`);
        let hasMore = this.data.hasMore;
        let pageSize = this.data.pageSize;
        let startIndex = this.data.startIndex;
        console.log(`publicGames:onLoad:hasMore:${hasMore} startIndex:${startIndex} pageSize:${pageSize}`);
        let query = new Parse.Query(Game);
        query.descending('_created_at');
        query.skip(startIndex);
        query.limit(pageSize);
        query.include('screens');
        query.find().then(function (games) {
            //为空或已经到最后一页
            if (games.length === 0) {
                that.setData({
                    hasMore: false,
                    loading: false,
                }, function () {
                    console.log(`setDataFinished:noMoreGames`);
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
            console.log(`publicGames:onLoad:startIndex:${startIndex}`);
            that.setData({
                startIndex: startIndex,
                pageSize: pageSize,
                hasMore: hasMore,
                loading: false,
                games: [...that.data.games, ...games]
            }, function () {
                console.log(`setDataFinished`);
            });
        }, function (error) {
            console.error(error);
        });
    }
})