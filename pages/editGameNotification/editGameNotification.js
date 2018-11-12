var Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
Page({
    /**
     * 页面的初始数据
     */
    data: {
        game: {},
        saving: false,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        let id = options.gameId;
        console.log(`editGameNotification:onLoad:id:${id}`);
        this._fetchGame(id);
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },


    bindFormSubmit: function (e) {
        let notification = e.detail.value.notification;
        console.log(`editGameNotification:bindFormSubmit:notification:${notification}`)
        if (!notification) {
            wx.showToast({
                title: '请输入通知',
                icon: 'none',
                duration: 2000
            });
        } else {
            let that = this;
            that.setData({
                saving: true,
            });
            let game = this.data.game;
            game.save({ notification }).then(function (game) {
                console.log(`editGameNotification:_update::notification：${notification}`);
                that.setData({
                    saving: false,
                });
                that._notifyPrevPage();
                wx.navigateBack({
                    delta: 1
                })
            }).catch(function (error) {
                console.log(`editGameNotification:_update:error:${JSON.stringify(error)}`)
                that.setData({
                    saving: false,
                });
            });
        }
    },
    /**
     * 根据ID获取game详情
     */
    _fetchGame: function (objectId) {
        console.log(`editGameNotification:_fetchGame:objectId:${objectId}`);
        let that = this;
        let query = new Parse.Query(Game);
        query.select(['notification'])
        query.get(objectId).then(function (game) {
            console.log(`editGameNotification:_fetchGame:game:${game.id}`);
            that.setData({
                game: game
            }, function () {
                console.log(`editGameNotification:_fetchGame:setDataFinished`);
            });
        })
    },
    /**
     * 通知列表重新获取盲注模板列表
     */
    _notifyPrevPage: function () {
        var pages = getCurrentPages();
        var currPage = pages[pages.length - 1]; //当前页面
        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
            needReload: true,
        }, function () {
            console.log(`editGameNotification:_notifyPrevPage:setDataFinished`);
        });
    },
})