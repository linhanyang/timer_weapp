const util = require('../../utils/util.js')
let Parse = require('../../parse');
let Game = Parse.Object.extend("PublicGame");
let Pattern = Parse.Object.extend("PublicPattern");
Page({
    /**
     * 页面的初始数据
     */
    data: {
        patterns: [],
        patternIndex: -1,
        date: '',
        time: '',
        title: '',
        startTime: 0,
        startChips: 0,
        rounds: [],
        saving: false,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        this._fetchPatterns();
        let date = new Date();
        let dateStr = util.formatDate(date);
        let timeStr = util.formatTime(date);

        console.log(`editPublicGame:onLoad:dateStr:${dateStr} :timeStr:${timeStr}`)
        this.setData({
            date: dateStr,
            time: timeStr,
        });
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },
    bindDateChange: function (e) {
        console.log(`editPublicGame:bindDateChange:date:${e.detail.value}`)
        this.setData({
            date: e.detail.value
        })
    },
    bindTimeChange: function (e) {
        console.log(`editPublicGame:bindTimeChange:time:${e.detail.value}`)
        this.setData({
            time: e.detail.value
        })
    },
    bindPatternChange: function (e) {
        let index = e.detail.value;
        let patterns = this.data.patterns;
        let pattern;
        if (index !== -1 && index < patterns.length) {
            pattern = patterns[index];
        }
        if (pattern) {
            let rounds = pattern.get('rounds');
            if (rounds) {
                this.setData({
                    patternIndex: index,
                    pattern,
                    rounds,
                    patternError: null,
                })
            }
        }
    },
    bindBlur: function (e) {
        let id = e.currentTarget.id;
        let value = e.detail.value;
        console.log(`editPublicGame:bindBlur:id:${id} value:${value}`);
        this._validateInput(id, value);
        console.log(`editPublicGame:bindBlur1:id:${id} value:${value}`);
    },
    bindErrorTip: function (e) {
        let id = e.currentTarget.id;
        let error;
        switch (id) {
            case 'title': {
                error = this.data.titleError;
            } break;
            case 'startChips': {
                error = this.data.startChipsError;
            } break;
        }
        console.log(`editPublicGame:bindErrorTip:error:${error}`);
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
            this._saveGame();
        }
    },
    /**
     * 获取所有的盲注模板
     */
    _fetchPatterns: function () {
        let that = this;
        let query = new Parse.Query(Pattern);
        query.descending('_created_at');
        query.find().then(function (patterns) {
            that.setData({
                patterns
            })
        }, function (error) {
            console.error(`editPublicGame:_fetchPatterns:${error}`)
        });
    },

    /**
     * 保存
     */
    _saveGame: function () {
        let that = this;
        let title = this.data.title;
        let startChips = this.data.startChips;
        let datetime = this.data.date + "T" + this.data.time + ":00";//生成2018-04-03T20:00:00的格式
        let startTime = new Date(Date.parse(datetime));
        console.log(`editPublicGame:_saveGame:dateTime:${util.formatDateTime(startTime)}`);

        let pattern = this.data.pattern;
        let rounds = pattern.get('rounds');
        console.log(`editPublicGame:_saveGame:rounds:${rounds.length}`);


        let game = new Game();
        game.set('title', title);
        game.set('startChips', startChips);
        game.set('startTime', startTime);
        game.set('rounds', rounds);

        //设置Acl
        let gameAcl = new Parse.ACL();
        gameAcl.setPublicReadAccess(true);
        gameAcl.setPublicWriteAccess(true);
        // gameAcl.setRoleWriteAccess('admin', true);
        // gameAcl.setRoleReadAccess('admin', true);
        // gameAcl.setReadAccess(Parse.User.current().id, true);
        // gameAcl.setWriteAccess(Parse.User.current().id, true);
        game.set('ACL', gameAcl);

        game.save().then(function (game) {
            console.log(`editPublicGame:_saveGame:game:${game.id}`);
            that.setData({
                saving: false,
            });
            wx.navigateBack({
                delta: 1
            })
        }, function (error) {
            console.log(`editPublicGame:_saveGame:error:${JSON.stringify(error)}`)
        });
    },

    /**
     * 验证input输入是否正确
     */
    _validateInput: function (id, value) {
        // console.log(`editPublicGame:_validateTitle:id:${id} value:${value}`)
        console.log(`editPublicGame:_validateInput`)
        let error = null;
        switch (id) {
            case 'title': {
                if (!value || value.length === 0) {
                    error = "比赛名称不能为空"
                } else if (value.length < 4) {
                    error = "比赛名称太短"
                } else if (value.length > 30) {
                    error = "比赛名称名称太长"
                }
                this.setData({
                    title: value,
                    titleError: error,
                })
            } break;
            case 'startChips': {
                if (!value || value.length === 0) {
                    error = "起始筹码不能为空"
                } else if (value.length < 2) {
                    error = "起始筹码太少"
                } else if (value.length > 6) {
                    error = "起始筹码太多"
                }
                this.setData({
                    startChips: value,
                    startChipsError: error,
                })
            } break;
        }
    },
    /**
     * 提交之前 验证所有表单项
     */
    _validateAll: function () {
        let result = false;

        //验证输入框
        let title = this.data.title;
        let startChips = this.data.startChips;
        this._validateInput('title', title);
        this._validateInput('startChips', startChips);

        //验证盲注模板
        let pattern = this.data.pattern;
        if (!pattern) {
            this.setData({
                patternError: '请选择盲注结构',
            })
        }

        //所有验证结果都为空  说明验证通过
        let titleError = this.data.titleError;
        let startChipsError = this.data.startChipsError;
        let patternError = this.data.patternError;
        if (!titleError && !startChipsError && !patternError) {
            result = true;
        }
        return result;
    }
})