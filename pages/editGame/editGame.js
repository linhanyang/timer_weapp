const util = require('../../utils/util.js')
let Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
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
        subTitle: '',
        startTime: 0,
        startChips: 0,
        rebuy: false,
        rebuyChips: 0,
        addon: false,
        addonChips: 0,
        players: 0,
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

        console.log(`editGame:onLoad:dateStr:${dateStr} :timeStr:${timeStr}`)
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
    bindRebuyChange: function (e) {
        this.setData({
            rebuy: !this.data.rebuy,
        })
    },
    bindAddonChange: function (e) {
        this.setData({
            addon: !this.data.addon,
        })
    },
    bindDateChange: function (e) {
        console.log(`editGame:bindDateChange:date:${e.detail.value}`)
        this.setData({
            date: e.detail.value
        })
    },
    bindTimeChange: function (e) {
        console.log(`editGame:bindTimeChange:time:${e.detail.value}`)
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
        console.log(`editGame:bindBlur:id:${id} value:${value}`);
        this._validateInput(id, value);
        console.log(`editGame:bindBlur1:id:${id} value:${value}`);
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
            case 'rebuyChips': {
                error = this.data.rebuyChipsError;
            } break;
            case 'addonChips': {
                error = this.data.addonChipsError;
            } break;
            case 'players': {
                error = this.data.playersError;
            } break;
        }
        console.log(`editGame:bindErrorTip:error:${error}`);
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
        let Pattern = Parse.Object.extend("Pattern");
        let query = new Parse.Query(Pattern);
        query.descending('_created_at');
        query.find().then(function (patterns) {
            that.setData({
                patterns
            })
        }, function (error) {
            console.error(`editGame:_fetchPatterns:${error}`)
        });
    },

    /**
     * 保存
     */
    _saveGame: function () {
        let that = this;
        let title = this.data.title;
        let subTitle = this.data.subTitle;
        let startChips = this.data.startChips;

        let rebuy = this.data.rebuy;
        let rebuyChips = this.data.rebuyChips;
        let addon = this.data.addon;
        let addonChips = this.data.addonChips;
        let players = this.data.players;
        let rewardPlayers = this.data.rewardPlayers;
        let restPlayers = this.data.restPlayers;

        let datetime = this.data.date + "T" + this.data.time + ":00";//生成2018-04-03T20:00:00的格式
        let startTime = new Date(Date.parse(datetime));
        console.log(`editGame:_saveGame:dateTime:${util.formatDateTime(startTime)}`);

        let pattern = this.data.pattern;
        let rounds = pattern.get('rounds');
        console.log(`editGame:_saveGame:rounds:${rounds.length}`);


        let game = new Game();
        game.set('title', title);
        game.set('subTitle', subTitle);
        game.set('startChips', parseInt(startChips));
        game.set('startTime', startTime);
        game.set('rebuy', rebuy);
        if (rebuy)
            game.set('rebuyChips', parseInt(rebuyChips));
        game.set('addon', addon);
        if (addon)
            game.set('addonChips', parseInt(addonChips));
        game.set('players', parseInt(players));
        game.set('restPlayers', parseInt(restPlayers));
        game.set('rewardPlayers', parseInt(rewardPlayers));

        game.set('rounds', rounds);


        //设置Acl
        let gameAcl = new Parse.ACL();
        gameAcl.setPublicReadAccess(false);
        gameAcl.setPublicWriteAccess(false);
        gameAcl.setRoleWriteAccess('admin', true);
        gameAcl.setRoleReadAccess('admin', true);

        let curRole = Parse.User.current().get('curRole');
        curRole.fetch().then(function (curRole) {
            console.log(`editGame:_saveGame:curRole:${curRole}`);
            gameAcl.setRoleReadAccess(curRole, true);
            gameAcl.setRoleWriteAccess(curRole, true);
            game.set('ACL', gameAcl);
            return game.save();
        }).then(function (game) {
            console.log(`editGame:_saveGame:game:${game.id}`);
            that.setData({
                saving: false,
            });
            wx.navigateBack({
                delta: 1
            })
        }, function (error) {
            console.log(`editGame:_saveGame:error:${JSON.stringify(error)}`)
        });
    },

    /**
     * 验证input输入是否正确
     */
    _validateInput: function (id, value) {
        // console.log(`editGame:_validateTitle:id:${id} value:${value}`)
        console.log(`editGame:_validateInput`)
        let error = null;
        switch (id) {
            case 'title': {
                if (!value || value.length === 0) {
                    error = "标题不能为空"
                } else if (value.length < 4) {
                    error = "标题太短"
                } else if (value.length > 10) {
                    error = "标题名称太长"
                }
                this.setData({
                    title: value,
                    titleError: error,
                })
            } break;
            case 'subTitle': {
                if (!value || value.length === 0) {
                    error = "次标题不能为空"
                } else if (value.length < 4) {
                    error = "次标题太短"
                } else if (value.length > 10) {
                    error = "次标题名称太长"
                }
                this.setData({
                    subTitle: value,
                    subTitleError: error,
                })
            } break;
            case 'startChips': {
                if (!value || value.length === 0) {
                    error = "起始筹码不能为空"
                } else if (value.length <= 0) {
                    error = "是大于0的整数"
                }
                this.setData({
                    startChips: value,
                    startChipsError: error,
                })
            } break;
            case 'rebuyChips': {
                if (!value || value.length === 0) {
                    error = "重买筹码不能为空"
                } else if (value <= 0) {
                    error = "是大于0的整数"
                }
                this.setData({
                    rebuyChips: value,
                    rebuyChipsError: error,
                })
            } break;
            case 'addonChips': {
                if (!value || value.length === 0) {
                    error = "加买筹码不能为空"
                } else if (value <= 0) {
                    error = "是大于0的整数"
                }
                this.setData({
                    addonChips: value,
                    addonChipsError: error,
                })
            } break;
            case 'players': {
                if (!value || value.length === 0) {
                    error = "人数不能为空"
                } else if (value <= 0) {
                    error = "是大于0的整数"
                }
                this.setData({
                    players: value,
                    playersError: error,
                })
            } break;
            case 'rewardPlayers': {
                if (!value || value.length === 0) {
                    error = "奖励人数不能为空"
                } else if (value <= 0) {
                    error = "是大于0的整数"
                }
                this.setData({
                    rewardPlayers: value,
                    rewardPlayersError: error,
                })
            } break;
            case 'restPlayers': {
                if (!value || value.length === 0) {
                    error = "剩余人数不能为空"
                } else if (value <= 0) {
                    error = "是大于0的整数"
                }
                this.setData({
                    restPlayers: value,
                    restPlayersError: error,
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
        let subTitle = this.data.subTitle;
        let startChips = this.data.startChips;
        this._validateInput('title', title);
        this._validateInput('subTitle', subTitle);
        this._validateInput('startChips', startChips);

        let rebuy = this.data.rebuy;
        let rebuyChips = this.data.rebuyChips;
        let addon = this.data.addon;
        let addonChips = this.data.addonChips;

        if (rebuy) {
            this._validateInput('rebuyChips', rebuyChips);
        }
        if (addon) {
            this._validateInput('addonChips', addonChips);
        }
        let players = this.data.players;
        this._validateInput('players', players);

        let restPlayers = this.data.restPlayers;
        this._validateInput('restPlayers', restPlayers);

        let rewardPlayers = this.data.rewardPlayers;
        this._validateInput('rewardPlayers', rewardPlayers);

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