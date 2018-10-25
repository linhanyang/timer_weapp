// pages/patterns/patterns.js
let Parse = require('../../parse');
let Pattern = Parse.Object.extend("Pattern");
Page({
    /**
     * 页面的初始数据
     */
    data: {
        patterns: [],
        needReload: false,
        //右滑相关
        // toggle: false,//右滑开关
        toggles: [],//左滑开关
        oldExpanded: false,//右滑是否打开
        nextExpanded: false,
        soPattern: null,//正在右滑的user swipeOutUser
        //ActionSheet相关
        asVisible: false,
        asActions: [
            {
                name: '删除',
                color: '#ed3f14'
            }
        ]
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        this._fetchPatterns();
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        if (this.data.needReload) {
            this._fetchPatterns();
            this.setData({ needReload: false });
        }
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 新建按钮事件
     */
    handleCreatePattern: function (e) {
        //跳转到editPattern的编辑界面
        wx.navigateTo({
            url: `../editPattern/editPattern?action=add`,
        })
    },

    /**
     * 单击有两种操作
     * 如果是展开状态，关闭展开
     * 如果是关闭状态，跳转
     */
    soCotentTapAction: function (e) {
        console.log(`patterns:soCotentTapAction:oldExpanded:${this.data.oldExpanded} nextExpanded:${this.data.nextExpanded}`);
        let oldExpanded = this.data.oldExpanded;
        let nextExpanded = this.data.nextExpanded;

        //因为swipeout的Touchstart,Touchmove,Touchend顺序执行完之后才会执行到content的Tap事件，
        //swipeout在touchend中通过前两个方法中产生的数据计算当前操作是展开还是关半，因此expanded状态的值也是在touchend中改变的
        //因此只有oldExpanded和nextExpanded都为false时，才能说明这个swipeout是真正关闭的，才能跳转
        if (oldExpanded == false && nextExpanded == false) {
            let objectId = e.currentTarget.dataset.pattern;
            //跳转到editPattern的编辑界面
            wx.navigateTo({
                url: `../editPattern/editPattern?patternId=${objectId}&action=edit`,
            })

            this.setData({
                asVisible: false,
                soPattern: null,
            });

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
        console.log(`patterns:onExpandedChange:old:${old} next:${next} toggles:${this.data.toggles}`);
        this.setData({ oldExpanded: old, nextExpaned: next });
        if (old == false && next == true) {
            this._closeAllSwipeoutExcept(index);
        }
    },

    /**
     * ActionSheet取消按钮事件
     */
    handleASCancel: function () {
        this.setData({
            asVisible: false,
            soPattern: null,
        });
        this._closeAllSwipeout();
    },


    /**
     * ActionSheet单击事件 可能有多个操作 
     * 通过detail.index区分 
     * 只有删除
     */
    handleASItemClick: function ({ detail }) {
        //先设置转圈
        let index = detail.index;
        let actions = [...this.data.asActions];
        actions[index].loading = true;
        this.setData({
            asActions: actions
        });

        //要删除的项已经由SwipeOut的单击事件指定为soPattern
        let pattern = this.data.soPattern;
        let that = this;
        pattern.destroy().then(function (pattern) {
            //删除成功要更新数据
            let patterns = that.data.patterns;
            let toggles = that.data.toggles;
            let pIndex = patterns.findIndex(function (value, index, arr) {
                return value.id === pattern.id;
            });
            if (pIndex != -1) {
                patterns.splice(pIndex, 1);
                toggles.splice(pIndex, 1);
            }
            //不在转圈
            actions[index].loading = false;
            that.setData({
                patterns,
                toggles,
                asVisible: false,
                soPattern: null,
                asActions: actions,
                // toggle: that.data.toggle ? false : true
            });
            that._closeAllSwipeout();
        }).catch(function (e) {
            actions[index].loading = false;
            that.setData({
                asVisible: false,
                soPattern: null,
                asActions: actions,
                // toggle: that.data.toggle ? false : true
            });
            that._closeAllSwipeout();
        });
    },

    /**
     * swipeOut的删除事件
     */
    soDeleteTapAction: function (e) {
        let objectId = e.currentTarget.dataset.pattern;
        console.log(`patterns:soDeleteTapAction:objectId:${JSON.stringify(objectId)}`);
        //找
        let pattern = this.data.patterns.find(function (value) {
            return value.id === objectId;
        });
        this.setData({
            asVisible: true,
            soPattern: pattern
        });
    },
    /**
     * 关闭所有有的swipeout 除了指定的index
     */
    _closeAllSwipeoutExcept: function (index) {
        console.log(`patterns:_closeAllSwipeoutExcept:index:${index} toggles:${this.data.toggles}`);
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
        console.log(`patterns:_closeAllSwipeout:toggles:${this.data.toggles}`);
        let toggles = this.data.toggles;
        for (let i = 0; i < toggles.length; i++) {
            toggles[i] = toggles[i] ? false : true;;
        }
        this.setData({ toggles });
    },

    /**
     * 分页获取game列表
     */
    _fetchPatterns: function () {
        this.setData({
            loading: true,
        });
        let that = this;
        let query = new Parse.Query(Pattern);
        query.descending('createdAt');
        query.include('rounds');
        query.find().then(function (patterns) {
            console.log(`patterns:_fetchPatterns:patterns:${JSON.stringify(patterns)}`);
            //初始化toggles为全部关闭
            let toggles = [];
            patterns.forEach(pattern => {
                toggles.push(false);
            });

            that.setData({
                patterns,
                patternsForView: that._createPatternsForView(patterns),
                needReload: false,
                toggles
            });

        });
    },
    /**
     * wxml中wx:for如果传Parse Object
     * 凡是通过object.get('name')来获取的数据都可能为空 还会报Expect FLOW_CREATE_NODE but get another错误
     * 所以重新生成一gamesForView数组，专门用于wxml中显示使用
     */
    _createPatternsForView: function (patterns) {
        let patternsForView = [];
        patterns.forEach(item => {
            patternsForView.push({ objectId: item.id, id: item.id, title: item.get('title'), rounds: item.get('rounds') })
        });
        return patternsForView;
    },

})