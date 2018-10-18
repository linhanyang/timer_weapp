var Parse = require('../../parse');
// let Pattern = Parse.Object.extend("Pattern");
let Pattern = Parse.Object.extend("PublicPattern");
Page({
    /**
     * 页面的初始数据
     */
    data: {
        pattern: {},
        rounds: [],
        action: '',//操作 添加或是编辑
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        let action = options.action;
        console.log(`editPublicPattern:onLoad:action:${action}`);
        this.setData({
            action,
        });
        //如果编辑
        if (action === 'edit') {
            this._fetchPattern(options.patternId);
        } else {

        }
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
    /**
     * 盲注级别操作
     */
    tapAction(e) {
        let action = e.currentTarget.dataset.action;
        let level = e.currentTarget.dataset.roundLevel;
        console.log(`rounds:tapAction:action:${action.key} level:${level}`);
        switch (action.key) {
            case 'delete': {
                this.triggerEvent('delete', { level });
            } break;
            case 'edit': {
                //跳转到editRound的编辑界面
                wx.navigateTo({
                    url: `../editRound4pattern/editRound4pattern?level=${level}&rounds=${JSON.stringify(this.data.rounds)}&action=edit`,
                })
            } break;
            case 'addRound': {
                wx.navigateTo({
                    url: `../editRound4pattern/editRound4pattern?level=${level}&rounds=${JSON.stringify(this.data.rounds)}&action=add`,
                })
            } break;
        }
    },
    /**
     * 每个盲注的操作展开开关
     */
    kindToggle: function (e) {
        var id = e.currentTarget.id
        var list = this.data.rounds;
        for (var i = 0, len = list.length; i < len; ++i) {
            if (list[i].id == id) {
                list[i].open = !list[i].open
            } else {
                list[i].open = false
            }
        }
        this.setData({
            rounds: list
        });
    },
    bindTitleBlur: function (e) {
        let value = e.detail.value;
        this._validateTitleInput(value);
    },
    bindErrorTip: function (e) {
        let id = e.currentTarget.id;
        let error;
        switch (id) {
            case 'title': {
                error = this.data.titleError;
            } break;
        }
        wx.showToast({
            title: error,
            icon: 'none',
            duration: 2000
        })
    },
    bindAppendTap: function (e) {
        let rounds = this.data.rounds;
        if (!rounds || rounds.length === 0) {
            let round = {
                level: 1,
                ante: 5,
                smallBlind: 10,
                bigBlind: 20,
                duration: 30,
            }
            rounds = [];
            rounds.push(round);
        } else {
            let level = rounds[rounds.length - 1].level + 1;
            let smallBlind = level * 10;
            let bigBlind = level * 20;
            let round = { ...rounds[rounds.length - 1], level, smallBlind, bigBlind };
            rounds.push(round);
        }
        this.setData({
            rounds,
        })
    },
    bindSubmitTap: function (e) {
        let that = this;
        that.setData({
            saving: true,
        });
        if (this._validateAll()) {
            if (this.data.action === 'add') {
                this._addPattern();
            } else if (this.data.action === 'edit') {
                this._updatePattern();
            }
        }
    },
    /**
     * 验证input输入是否正确
     */
    _validateTitleInput: function (value) {
        // console.log(`editPublicPattern:_validateTitle:id:${id} value:${value}`)
        console.log(`editPublicPattern:_validateInput`)
        let error = null;
        if (!value || value.length === 0) {
            error = "模板名称不能为空"
        } else if (value.length < 4) {
            error = "模板名称太短"
        } else if (value.length > 30) {
            error = "模板名称太长"
        }
        this.setData({
            title: value,
            titleError: error,
        });
    },
    /**
     * 提交之前 验证所有表单项
     */
    _validateAll: function () {
        let result = false;

        //验证输入框
        let title = this.data.title;
        this._validateTitleInput(title);

        //验证盲注模板
        let rounds = this.data.rounds;
        if (!rounds || rounds.length === 0) {
            let roundsError = '请输入盲注列表';
            this.setData({
                roundsError,
            });
            wx.showToast({
                title: roundsError,
                icon: 'none',
                duration: 2000
            });
        }

        //所有验证结果都为空  说明验证通过
        let titleError = this.data.titleError;
        let roundsError = this.data.roundsError;
        if (!titleError && !roundsError) {
            result = true;
        }
        return result;
    },
    /**
     * 新建
     */
    _addPattern() {
        let that = this;
        let pattern = new Pattern();
        let rounds = this.data.rounds;
        let title = this.data.title;

        //把展现用的属性删除 不保存到数据库
        for (let round of rounds) {
            round.id = undefined;
            round.actions = undefined;
            round.open = undefined;
            delete round.id;
            delete round.actions;
            delete round.open;
        }


        pattern.save({ title, rounds }).then(function (pattern) {
            console.log(`editPublicPattern:_addPattern::${JSON.stringify(pattern)}`);
            that.setData({
                saving: false,
            });
            that._notifyPrevPage();
            wx.navigateBack({
                delta: 1
            })
        }, function (error) {
            console.log(`editPublicPattern:_addPattern:error:${JSON.stringify(error)}`)
        });
    },
    /**
     * 编辑
     */
    _updatePattern() {
        let that = this;
        let pattern = this.data.pattern;
        let rounds = this.data.rounds;

        //把展现用的属性删除 不保存到数据库
        delete pattern.open;
        delete pattern.actions;
        for (let round of rounds) {
            round.id = undefined;
            round.actions = undefined;
            round.open = undefined;
            delete round.id;
            delete round.actions;
            delete round.open;
        }

        pattern.save({ rounds }).then(function (pattern) {
            console.log(`editPublicPattern:_updatePattern::${JSON.stringify(pattern)}`);
            that.setData({
                saving: false,
            });
            that._notifyPrevPage();
            wx.navigateBack({
                delta: 1
            })
        }, function (error) {
            console.log(`editPublicPattern:_updatePattern:error:${JSON.stringify(error)}`)
        });
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
            console.log(`editPublicPattern:_notifyPrevPage:setDataFinished`);
        });
    },
    /**
     * 根据ID获取pattern详情
     */
    _fetchPattern: function (objectId) {
        console.log(`editPublicPattern:_fetchPattern:objectId:${objectId}`);
        let that = this;
        let query = new Parse.Query(Pattern);
        query.include('rounds');
        query.get(objectId).then(function (pattern) {
            console.log(`editPublicPattern:_fetchPattern:pattern:${pattern.get('title')}`);
            that._generateRounds(pattern);
            that.setData({ pattern: pattern }, function () {
                console.log(`editPublicPattern:_fetchPattern:setDataFinished`);
            });
        }, function (error) {
            console.error(error);
        })
    },
    /**
     * 以Pattern中rounds为基础
     * 再根据currentRoundIndex和status生成带不同操作的盲注列表
     * properties中Pattern、currentRoundIndex、status有改变，都强制触发此方法更新rounds
     */
    _generateRounds: function (pattern) {
        console.log(`editPublicPattern:_generateRounds`);
        let list = pattern.get('rounds');
        let rounds = [];
        let actions = [{ key: 'addRound', lbl: '在此别下添加级别' }, { key: 'edit', lbl: '编辑' }, { key: 'delete', lbl: '删除' }];
        for (let i = 0; i < list.length; i++) {
            let round = { ...list[i], id: i, open: false, actions };
            rounds.push(round);
        }
        this.setData({
            rounds: rounds
        }, function () {
            console.log(`editPublicPattern:_generateRounds:setDataFinished`);
        });
    }
})