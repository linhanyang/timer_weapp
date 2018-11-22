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
        title: 'Hulu计时',
        startTime: 0,
        chipss: [
            { name: '起始', value: 1000 },
            { name: '重买', value: 1000 },
            { name: '加买', value: 1000 }
        ],
        rounds: [],

        saving: false,
        //右滑操作相关
        toggles: [false, false, false],//左滑开关
        oldExpanded: false,//右滑是否打开
        nextExpanded: false,
        soActions: [
            {
                name: '删除',
                color: '#fff',
                fontsize: '20',
                width: 100,
                icon: 'delete',
                background: '#ed3f14'
            }
        ]
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        this._fetchPatterns();
        let date = new Date();
        let dateStr = util.formatDate(date);
        let timeStr = util.formatTime(date);

        console.log(`addGame:onLoad:dateStr:${dateStr} :timeStr:${timeStr}`)
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
        console.log(`addGame:bindDateChange:date:${e.detail.value}`)
        this.setData({
            date: e.detail.value
        })
    },
    bindTimeChange: function (e) {
        console.log(`addGame:bindTimeChange:time:${e.detail.value}`)
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
        console.log(`addGame:bindBlur:id:${id} value:${value}`);
        this._validateInput(id, value);
        console.log(`addGame:bindBlur1:id:${id} value:${value}`);
    },
    bindErrorTip: function (e) {
        let id = e.currentTarget.id;
        let error;
        switch (id) {
            case 'title': {
                error = this.data.titleError;
            } break;
        }
        console.log(`addGame:bindErrorTip:error:${error}`);
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
     * 左滑展开后按钮操作
     * @param {*} e 
     */
    handlerSoChange: function (e) {
        let actionIndex = e.detail.index;
        let action = this.data.soActions[actionIndex];
        let name = e.currentTarget.dataset.chipsName;
        console.log(`rounds:handleSoChange:action:${action} name:${name}`);
        switch (action.name) {
            case '删除'://删除
                this._deleteChips(name);
                break;
            default:
                break;
        }

        this._closeAllSwipeout();
    },

    /**
     * 
     * 单击有两种操作
     * 如果是展开状态，关闭展开
     * 如果是关闭状态，跳转到编辑界面
     */
    handlerSoCotentTap: function (e) {
        let oldExpanded = this.data.oldExpanded;
        let nextExpanded = this.data.nextExpanded;
        //因为swipeout的Touchstart,Touchmove,Touchend顺序执行完之后才会执行到content的Tap事件，
        //swipeout在touchend中通过前两个方法中产生的数据计算当前操作是展开还是关半，因此expanded状态的值也是在touchend中改变的
        //因此只有oldExpanded和nextExpanded都为false时，才能说明这个swipeout是真正关闭的，才能跳转
        if (oldExpanded == false && nextExpanded == false) {

            console.log(`addGame:handlerSoCotentTap:dataset:${JSON.stringify(e.currentTarget.dataset)}`);
            //没有左滑
            let name = e.currentTarget.dataset.chipsName;
            console.log(`addGame:handlerSoCotentTap:dataset:${name}`);
            //跳转到editChips的编辑界面
            wx.navigateTo({
                url: `../editChips4Game/editChips4Game?name=${name}&chipss=${JSON.stringify(this.data.chipss)}&action=edit`,
            })

            this._closeAllSwipeout();
        }
    },


    /**
     * 追加级别
     * @param {*} e 
     */
    bindAppendTap: function (e) {
        //跳转到editChips的编辑界面
        wx.navigateTo({
            url: `../editChips4Game/editChips4Game?chipss=${JSON.stringify(this.data.chipss)}&action=add`,
        })
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
        console.log(`addGame:onExpandedChange:old:${old} next:${next} index:${index}`);
        this.setData({ oldExpanded: old, nextExpaned: next });
        if (old == false && next == true) {
            this._closeAllSwipeoutExcept(index);
        }
    },


    /**
     * 关闭所有有的swipeout 除了指定的index
     */
    _closeAllSwipeoutExcept: function (index) {
        console.log(`addGame:_closeAllSwipeoutExcept:index:${index} toggles:${this.data.toggles}`);
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
        console.log(`addGame:_closeAllSwipeout:toggles:${this.data.toggles}`);
        let toggles = this.data.toggles;
        for (let i = 0; i < toggles.length; i++) {
            toggles[i] = toggles[i] ? false : true;;
        }
        this.setData({ toggles });
    },


    /**
     * 删除一个筹码方案
     * @param {*} level 
     */
    _deleteChips: function (name) {
        let chipss = this.data.chipss;
        let toggles = this.data.toggles;
        //删除  看看name存不存在
        let index = chipss.findIndex(function (value) {
            return value.name === name;
        });
        if (index != -1) {
            //删除
            chipss.splice(index, 1);
            toggles.splice(index, 1);

            this.setData({
                chipss,
                toggles,
            });
        }
    },

    /**
     * 获取所有的盲注模板
     */
    _fetchPatterns: function () {
        let that = this;
        let Pattern = Parse.Object.extend("Pattern");
        let query = new Parse.Query(Pattern);
        query.find().then(function (patterns) {
            let patterns4View = [];
            for (let i = 0; i < patterns.length; i++) {
                const pattern = patterns[i];
                patterns4View.push({
                    id: pattern.id,
                    objectId: pattern.get('objectId'),
                    title: pattern.get('title'),
                    rounds: pattern.get('rounds')
                })

            }
            that.setData({
                patterns,
                patterns4View
            })
        });
    },

    /**
     * 保存
     */
    _saveGame: function () {
        let that = this;
        let title = this.data.title;

        let datetime = this.data.date + "T" + this.data.time + ":00";//生成2018-04-03T20:00:00的格式
        let startTime = new Date(Date.parse(datetime));
        console.log(`addGame:_saveGame:dateTime:${util.formatDateTime(startTime)}`);

        let pattern = this.data.pattern;
        let rounds = pattern.get('rounds');
        console.log(`addGame:_saveGame:rounds:${rounds.length}`);

        let chipss = this.data.chipss;
        let game = new Game();
        game.set('title', title);
        game.set('startTime', startTime);
        game.set('startTime4View', startTime);
        game.set('players', 0);
        game.set('restPlayers', 0);
        game.set('rewardPlayers', 0);

        game.set('rounds', rounds);
        game.set('chipss', chipss);


        //设置Acl
        let gameAcl = new Parse.ACL();
        gameAcl.setPublicReadAccess(false);
        gameAcl.setPublicWriteAccess(false);
        gameAcl.setRoleWriteAccess('admin', true);
        gameAcl.setRoleReadAccess('admin', true);

        let curRole = Parse.User.current().get('curRole');
        curRole.fetch().then(function (curRole) {
            console.log(`addGame:_saveGame:curRole:${curRole}`);
            gameAcl.setRoleReadAccess(curRole, true);
            gameAcl.setRoleWriteAccess(curRole, true);
            game.set('ACL', gameAcl);
            game.set('role', curRole);
            return game.save();
        }).then(function (game) {
            console.log(`addGame:_saveGame:game:${game.id}`);
            that.setData({
                saving: false,
            });
            wx.navigateBack({
                delta: 1
            })
        }, function (error) {
            console.log(`addGame:_saveGame:error:${JSON.stringify(error)}`)
        });
    },

    /**
     * 验证input输入是否正确
     */
    _validateInput: function (id, value) {
        // console.log(`addGame:_validateTitle:id:${id} value:${value}`)
        console.log(`addGame:_validateInput`)
        let error = null;
        switch (id) {
            case 'title': {
                if (!value || value.length === 0) {
                    error = "标题不能为空"
                }
                this.setData({
                    title: value,
                    titleError: error,
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
        this._validateInput('title', title);

        //验证盲注模板
        let pattern = this.data.pattern;
        if (!pattern) {
            this.setData({
                patternError: '请选择盲注结构',
            })
        }

        //所有验证结果都为空  说明验证通过
        let titleError = this.data.titleError;
        let patternError = this.data.patternError;
        if (!titleError && !patternError) {
            result = true;
        }
        return result;
    }
})