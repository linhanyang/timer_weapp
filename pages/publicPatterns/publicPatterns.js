// pages/patterns/patterns.js
let Parse = require('../../parse');
// let Pattern = Parse.Object.extend("Pattern");
let Pattern = Parse.Object.extend("PublicPattern");
Page({

    /**
     * 页面的初始数据
     */
    data: {
        loading: false,
        patterns: [],
        needReload: false,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        this._fetchPatterns();
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        if (this.data.needReload) {
            this._fetchPatterns();
        }
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },
    bindAppendTap:function(e){
        //跳转到editPattern的编辑界面
        wx.navigateTo({
            url: `../editPublicPattern/editPublicPattern?action=add`,
        })
    },
    /**
     * 盲注级别操作
     */
    tapAction: function (e) {
        let action = e.currentTarget.dataset.action;
        let objectId = e.currentTarget.dataset.pattern;
        console.log(`rounds:tapAction:action:${action.key} level:${objectId}`);

        switch (action.key) {
            case 'delete': {
                let that = this;
                let pattern = this.data.patterns.find(function (value, index, arr) {
                    return value.id === objectId;
                });
                if (pattern) {
                    wx.showModal({
                        content: `你确定要删除${pattern.get('title')}吗？`,
                        success: function (res) {
                            if (res.confirm) {
                                //删除
                                pattern.destroy().then(function (pattern) {
                                    console.log(`rounds:delete:pattern:${pattern.get('title')}`);
                                    let patterns = that.data.patterns;
                                    let index = patterns.findIndex(function (value, index, arr) {
                                        return value.id === pattern.id;
                                    });
                                    console.log(`rounds:delete:index:${index}`);
                                    if (index != -1) {
                                        patterns.splice(index, 1);
                                    }
                                    console.log(`rounds:delete:patterns:${patterns.length}`);
                                    that.setData({
                                        patterns,
                                    })
                                }, function (error) {
                                });
                            } else if (res.cancel) {
                                console.log('用户点击取消')
                            }
                        }
                    });
                }
            } break;
            case 'edit': {
                //跳转到editPattern的编辑界面
                wx.navigateTo({
                    url: `../editPattern/editPattern?patternId=${objectId}&action=edit`,
                })
            } break;
        }
    },
    /**
     * 每个盲注的操作展开开关
     */
    kindToggle: function (e) {
        var id = e.currentTarget.id
        var list = this.data.patterns;
        for (var i = 0, len = list.length; i < len; ++i) {
            if (list[i].id == id) {
                list[i].set('open', !list[i].get('open'))
            } else {
                list[i].open = false
            }
        }
        this.setData({
            patterns: list
        });
    },
    /**
     * 分页获取game列表
     */
    _fetchPatterns: function () {
        this.setData({
            loading: true,
        });
        let that = this;
        console.log(`patterns:_fetchPatterns`);
        let query = new Parse.Query(Pattern);
        query.descending('_created_at');
        query.include('rounds');
        query.find()
            .then(function (results) {
                let patterns = [];
                let actions = [{ key: 'edit', lbl: '编辑' },  { key: 'delete', lbl: '删除' }];
                for (let i = 0; i < results.length; i++) {
                    let pattern = results[i];
                    pattern.set('open', false);
                    pattern.set('actions', actions);
                    patterns.push(pattern);
                }
                console.log(`patterns:_fetchPatterns:patterns:${patterns.length}`);
                that.setData({
                    loading: false,
                    patterns,
                    needReload: false,
                }, function () {
                    console.log(`patterns:_fetchPatterns:setDataFinished`);
                });
            }, function (error) {
                console.error(error);
            });
    }

})