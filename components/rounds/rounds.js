

var Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
/**
 * 操作常量
 */
const ACTIONS_MAP = new Map()
    .set('delete', '删除')
    .set('startLevel', '执行')
    .set('edit', '编辑')
    .set('add', '添加');
/**
 * 盲注列表
 * 以game中rounds为基础 
 * 再根据currentRoundIndex和status生成带不同操作的盲注列表
 */
Component({
    //在一个组件的定义和使用时，组件的属性名和 data 字段相互间都不能冲突（尽管它们位于不同的定义段中）
    properties: {
        game: {
            type: Object,
            value: undefined,
            observer: '_gameChange'
        },
        pCurrentRoundIndex: {
            type: Number,
            value: undefined,
            observer: '_indexChange'
        },
        pStatus: {
            type: String,
            value: undefined,
            observer: '_statusChange'
        },
    },


    data: {
        rounds: [],//盲注列表
        currentRoundIndex: -1,//当前执行中的roundIndex
        //左滑开关
        toggles: [],
        oldExpanded: false,//右滑是否打开
        nextExpanded: false,
        soRound: null,//正在右滑的round
        //ActionSheet相关
        asVisible: false,
        asActions: [
            {
                name: '删除',
                color: '#ed3f14'
            }
        ]
    },
    methods: {
        _gameChange(newGame, oldGame) {
            console.log(`rounds:_gameChange:newGame:${newGame && newGame.title}`);
            this._generateRounds();
        },
        _indexChange(newIndex, oldIndex) {
            console.log(`rounds:_indexChange:newIndex:${newIndex}`);
            this._generateRounds();
        },
        _statusChange(newStatus, oldStatus) {
            console.log(`rounds:_statusChange:newStatus:${newStatus}`);
            this._generateRounds();
        },
        /**
         * 单击有两种操作
         * 如果是展开状态，关闭展开
         * 如果是关闭状态，跳转
         */
        soCotentTapAction: function (e) {
            console.log(`rounds:soCotentTapAction:oldExpanded:${this.data.oldExpanded} nextExpanded:${this.data.nextExpanded}`);
            let oldExpanded = this.data.oldExpanded;
            let nextExpanded = this.data.nextExpanded;

            // 因为swipeout的Touchstart,Touchmove,Touchend顺序执行完之后才会执行到content的Tap事件，
            // swipeout在touchend中通过前两个方法中产生的数据计算当前操作是展开还是关半，因此expanded状态的值也是在touchend中改变的
            // 因此只有oldExpanded和nextExpanded都为false时，才能说明这个swipeout是真正关闭的，不跳转，也要清除其它的swipeout
            if (oldExpanded == false && nextExpanded == false) {
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
            // console.log(`rounds:onExpandedChange:old:${old} next:${next} index:${index}`);
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
                asContent: '',
                soRound: null,
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

            let round = this.data.soRound;

            this.triggerEvent('delete', { level: round.level });

            //不在转圈
            actions[index].loading = false;
            this.setData({
                asVisible: false,
                soRound: null,
                asActions: actions,
            });
            this._closeAllSwipeout();
        },

        /**
         * swipeOut的选项点击事件
         */
        soItemTapAction: function (e) {
            let action = e.currentTarget.dataset.action;
            let level = e.currentTarget.dataset.roundLevel;
            console.log(`rounds:soItemTapAction:action:${action} objectId:${level}`);
            switch (action) {
                case 'delete':
                    //找
                    let round = this.data.rounds.find(function (value) {
                        return value.level === level;
                    });
                    this.setData({
                        asVisible: true,
                        soRound: round
                    });
                    break;
                case 'startLevel':
                    this.triggerEvent('startLevel', { level });
                    this._closeAllSwipeout();
                    break;
                case 'edit': //跳转到editRound的编辑界面
                    wx.navigateTo({
                        url: `../editRound/editRound?gameId=${this.properties.game.id}&level=${level}&rounds=${JSON.stringify(this.properties.game.rounds)}&action=edit`,
                    })
                    this._closeAllSwipeout();
                    break;
                case 'add':
                    wx.navigateTo({
                        url: `../editRound/editRound?gameId=${this.properties.game.id}&level=${level}&rounds=${JSON.stringify(this.properties.game.rounds)}&action=add`,
                    });
                    this._closeAllSwipeout();
                    break;
                default:
                    break;
            }
        },
        /**
         * 关闭所有有的swipeout 除了指定的index
         */
        _closeAllSwipeoutExcept: function (index) {
            console.log(`rounds:_closeAllSwipeoutExcept:index:${index} toggles:${this.data.toggles}`);
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
            console.log(`rounds:_closeAllSwipeout:toggles:${this.data.toggles}`);
            let toggles = this.data.toggles;
            for (let i = 0; i < toggles.length; i++) {
                toggles[i] = toggles[i] ? false : true;;
            }
            this.setData({ toggles });
        },
        /**
         * 以game中rounds为基础
         * 再根据currentRoundIndex和status生成带不同操作的盲注列表
         * properties中game、currentRoundIndex、status有改变，都强制触发此方法更新rounds
         */
        _generateRounds: function () {
            console.log(`rounds:_generateRounds_:game:${this.properties.game && this.properties.game.title} pStatus:${this.properties.pStatus} pCurrentRoundIndexs:${this.properties.pCurrentRoundIndex}`);
            if (this.properties.game && this.properties.game.rounds && this.properties.pStatus) {
                let rounds = [];
                let toggles = [];
                for (let i = 0; i < this.properties.game.rounds.length; i++) {
                    let keys = [];//根据状态、当前盲注来确定的盲注操作 
                    let style = 'color:#000';
                    switch (this.properties.pStatus) {
                        case 'before': {
                            keys = ['startLevel', 'add', 'edit', 'delete',];
                        } break;
                        case 'gaming': {
                            if (i < this.properties.pCurrentRoundIndex) {
                                keys = ['startLevel'];
                                style = 'color:gray'
                            } else if (i === this.properties.pCurrentRoundIndex) {
                                keys = ['add', 'edit'];

                                style = 'color:green'
                            } else if (i > this.properties.pCurrentRoundIndex) {
                                keys = ['startLevel', 'add', 'edit', 'delete'];
                                style = 'color:black'
                            }
                        } break;
                        case 'after': {
                            keys = ['startLevel', 'add', 'edit', 'delete'];
                        } break;
                    }
                    let actions = [];
                    for (let key of keys) {
                        actions.push({ key, lbl: ACTIONS_MAP.get(key) });
                    }
                    let round = { ...this.properties.game.rounds[i], style, actions };
                    rounds.push(round);
                    toggles.push(false);
                }
                this.setData({
                    rounds,
                    toggles,
                    currentRoundIndex: this.properties.pCurrentRoundIndex
                });
            }
        }
    }
})
