const util = require('../../utils/util.js')
var Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
Page({

    /**
     * 页面的初始数据
     */
    data: {

    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        console.log(`editGame:onLoad:objectId:${options.objectId}`)
        this._fetchGame(options.objectId);
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    bindDateChange: function (e) {
        console.log(`editGame:bindDateChange:date:${e.detail.value}`)
        this.setData({
            gameForView: { ...this.data.gameForView, date: e.detail.value }
        })
    },
    bindTimeChange: function (e) {
        console.log(`editGame:bindTimeChange:time:${e.detail.value}`)
        this.setData({
            gameForView: { ...this.data.gameForView, time: e.detail.value }
        })
    },

    bindBlur: function (e) {
        this.setData({
            gameForView: { ...this.data.gameForView, title: e.detail.value }
        })
    },

    bindSubmitTap: function (e) {
        let that = this;
        that.setData({
            saving: true,
        });
        let title = this.data.title;
        let datetime = this.data.gameForView.date + "T" + this.data.gameForView.time + ":00";//生成2018-04-03T20:00:00的格式
        let startTime = new Date(Date.parse(datetime));

        console.log(`editGame:_saveGame:dateTime:${util.formatDateTime(startTime)}`);
        let game = this.data.game;
        game.set('title', title);
        game.set('startTime', startTime);
        game.set('startTime4View', startTime);
        game.save().then(function (game) {
            console.log(`editGame:_saveGame:game:${game.id}`);
            that.setData({
                saving: false,
            });
            wx.navigateBack({
                delta: 1
            })
        }).catch(function (error) {
            console.log(`editGame:_saveGame:error:${JSON.stringify(error)}`)
        });
    },
    /**
     * 根据ID获取game详情
     */
    _fetchGame: function (objectId) {
        console.log(`editGame:_fetchGame:objectId:${objectId}`);

        this.setData({ loading: true });
        let that = this;
        let query = new Parse.Query(Game);
        query.select(['title', 'startTime', 'startTime4View']);
        query.get(objectId).then(function (game) {
            console.log(`editGame:_fetchGame:game:${game && game.get('title')}`);
            that.setData({ game, gameForView: that._createGameForView(game), loading: false });
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
        let startTime4View = game.get('startTime4View');
        if (!startTime4View)
            startTime4View = game.get('startTime');
        let date = util.formatDate(startTime4View);
        let time = util.formatTime(startTime4View);
        let gameForView = {
            id: game.id,
            objectId: game.id,
            title: game.get('title'),
            date,
            time,
        };
        return gameForView;
    }
})