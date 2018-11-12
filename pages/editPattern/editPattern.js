var Parse = require('../../parse');
let Pattern = Parse.Object.extend("Pattern");
Page({
    /**
     * 页面的初始数据
     */
    data: {
        pattern: {},
        rounds: [],
        action: '',//操作 添加或是编辑
        toggles: [],//左滑开关
        oldExpanded: false,//右滑是否打开
        nextExpanded: false,
        soActions: [
            {
                name: '添加',
                color: '#fff',
                fontsize: '20',
                width: 100,
                icon: 'add',
                background: '#ed3f14'
            },
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
        let action = options.action;
        console.log(`editPattern:onLoad:action:${action}`);
        this.setData({
            action,
        });
        //如果编辑
        if (action === 'edit') {
            this._fetchPattern(options.patternId);
        }
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },
    /**
     * 左滑展开后按钮操作
     * @param {*} e 
     */
    handlerSoChange: function (e) {
        let actionIndex = e.detail.index;
        let action = this.data.soActions[actionIndex];
        let level = e.currentTarget.dataset.roundLevel;
        console.log(`rounds:handleSoChange:action:${action} level:${level}`);
        switch (action.name) {
            case '添加'://追加
                // 跳转到editRound的编辑界面
                wx.navigateTo({
                    url: `../editRound4pattern/editRound4pattern?level=${level}&rounds=${JSON.stringify(this.data.rounds)}&action=add`,
                })
                break;
            case '删除'://删除
                this._deleteRound(level);
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
            //没有左滑
            let level = e.currentTarget.dataset.roundLevel;
            //跳转到editRound的编辑界面
            wx.navigateTo({
                url: `../editRound4pattern/editRound4pattern?level=${level}&rounds=${JSON.stringify(this.data.rounds)}&action=edit`,
            })

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
        console.log(`rounds:onExpandedChange:old:${old} next:${next} index:${index}`);
        this.setData({ oldExpanded: old, nextExpaned: next });
        if (old == false && next == true) {
            this._closeAllSwipeoutExcept(index);
        }
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

    /**
     * 追加级别
     * @param {*} e 
     */
    bindAppendTap: function (e) {
        let rounds = this.data.rounds;
        let toggles = this.data.toggles;
        if (!rounds || rounds.length === 0) {
            let round = {
                level: 1,
                ante: 5,
                smallBlind: 10,
                bigBlind: 20,
                duration: 30,
                id: 0,
            }
            rounds = [];
            rounds.push(round);
        } else {
            let level = rounds[rounds.length - 1].level + 1;
            let smallBlind = level * 10;
            let bigBlind = level * 20;
            let round = { ...rounds[rounds.length - 1], level, smallBlind, bigBlind, id: level - 1 };
            rounds.push(round);
        }
        toggles.push(false);
        this.setData({
            rounds, toggles,
        })
    },
    /**
     * 提交操作
     * @param {*} e 
     */
    bindSubmitTap: function (e) {
        this.setData({
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
     * 关闭所有有的swipeout 除了指定的index
     */
    _closeAllSwipeoutExcept: function (index) {
        console.log(`editPattern:_closeAllSwipeoutExcept:index:${index} toggles:${this.data.toggles}`);
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
        console.log(`editPattern:_closeAllSwipeout:toggles:${this.data.toggles}`);
        let toggles = this.data.toggles;
        for (let i = 0; i < toggles.length; i++) {
            toggles[i] = toggles[i] ? false : true;;
        }
        this.setData({ toggles });
    },

    /**
     * 验证input输入是否正确
     */
    _validateTitleInput: function (value) {
        // console.log(`editPattern:_validateTitle:id:${id} value:${value}`)
        console.log(`editPattern:_validateInput`)
        let error = null;
        if (!value || value.length === 0) {
            error = "模板名称不能为空"
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
     * 删除一个级别
     * @param {*} level 
     */
    _deleteRound: function (level) {
        let rounds = this.data.rounds;
        let toggles = this.data.toggles;
        //范围 level是从1开始的
        if (level >= 1 && level <= rounds.length) {
            //删除  看看level存不存在
            let index = rounds.findIndex(function (value, index, arr) {
                return value.level === level;
            });
            if (index != -1) {
                //删除
                rounds.splice(index, 1);
                toggles.splice(index, 1);
                //大于selectedIndex level- 1 
                for (let i = index; i < rounds.length; i++) {
                    let round = rounds[i];
                    round.level = round.level - 1;
                }

                this.setData({
                    rounds,
                    toggles,
                });
            }
        }
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

        //设置Acl 
        let patternAcl = new Parse.ACL();
        patternAcl.setPublicReadAccess(false);
        patternAcl.setPublicWriteAccess(false);
        // patternAcl.setRoleWriteAccess('admin', true);
        // patternAcl.setRoleReadAccess('admin', true);

        let curRole = Parse.User.current().get('curRole');
        curRole.fetch().then(function (role) {
            if (role) {
                console.log(`editPattern:_savePattern:curRole:${curRole.get('name')}`);
                patternAcl.setRoleReadAccess(role, true);
                patternAcl.setRoleWriteAccess(role, true);
                pattern.set('ACL', patternAcl);
                return pattern.save({ title, rounds });
            } else {
                return Parse.Promise.error('无法获取的用户的当前角色，无法创建模板。');
            }
        }).then(function (pattern) {
            console.log(`editPattern:_addPattern::${pattern.get('title')}`);
            that.setData({
                saving: false,
            });
            that._notifyPrevPage();
            wx.navigateBack({
                delta: 1
            })
        }, function (error) {
            console.log(`editPattern:_addPattern:error:${JSON.stringify(error)}`)
            that.setData({
                saving: false,
            });
            wx.showToast({
                title: error,
                icon: 'none',
                duration: 2000
            })
        });

    },
    /**
     * 编辑
     */
    _updatePattern() {
        let that = this;
        let pattern = this.data.pattern;
        let rounds = this.data.rounds;

        pattern.save({ rounds }).then(function (pattern) {
            console.log(`editPattern:_updatePattern::${pattern && pattern.get('title')}`);
            that.setData({
                saving: false,
            });
            that._notifyPrevPage();
            wx.navigateBack({
                delta: 1
            })
        }, function (error) {
            console.log(`editPattern:_updatePattern:error:${JSON.stringify(error)}`)
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
            console.log(`editPattern:_updatePattern:setDataFinished`);
        });
    },
    /**
     * 根据ID获取pattern详情
     */
    _fetchPattern: function (objectId) {
        console.log(`editPattern:_fetchPattern:objectId:${objectId}`);
        let that = this;
        let query = new Parse.Query(Pattern);
        query.include('rounds');
        query.get(objectId).then(function (pattern) {
            console.log(`editPattern:_fetchPattern:pattern:${pattern.get('title')} rounds:${pattern.get('rounds')}`);
            let rounds = pattern.get('rounds');

            //初始化toggles为全部关闭
            let toggles = [];
            rounds.forEach(item => {
                toggles.push(false);
            });
            that.setData({
                pattern,
                patternForView: that._createPatternForView(pattern),
                rounds,
                toggles
            });
        }, function (error) {
            console.error(error);
        })
    },

    /**
     * wxml中wx:for如果传Parse Object
     * 凡是通过object.get('name')来获取的数据都可能为空 还会报Expect FLOW_CREATE_NODE but get another错误
     * 所以重新生成一patternForView对象，专门用于wxml中显示使用
     */
    _createPatternForView: function (pattern) {
        //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
        //添加startTimeMills、pauseTimeMills字段，根据startTime、pauseTime的getTime()生成startTimeMills
        let patternForView = {
            //id
            id: pattern.id,
            objectId: pattern.id,
            //desc
            title: pattern.get('title'),
        };
        return patternForView;
    }
})