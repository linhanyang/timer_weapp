

/**
 * 操作常量
 */
const ACTIONS_MAP = new Map()
    .set('delete', '删除')
    .set('startLevel', '从此级别开始')
    .set('edit', '编辑')
    .set('addRound', '在此别下添加级别');
/**
 * 盲注列表
 * 以game中rounds为基础 
 * 再根据currentRoundIndex和status生成带不同操作的盲注列表
 */
Component({

    properties: {
        game: {
            type: Object,
            value: undefined,
            observer: '_gameChange'
        },
        currentRoundIndex: {
            type: Number,
            value: -1,
            observer: '_indexChange'
        },
        status: {
            type: String,
            value: '',
            observer: '_statusChange'
        },
    },


    data: {
        rounds: []//盲注列表
    },
    methods: {
        _gameChange(newGame, oldGame) {
            console.log(`rounds:_gameChange:${newGame && JSON.stringify(newGame)}`);
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
                case 'startLevel': {
                    this.triggerEvent('startLevel', { level });
                } break;
                case 'edit': {
                    //跳转到editRound的编辑界面
                    wx.navigateTo({
                        url: `../editRound/editRound?gameId=${this.properties.game.objectId}&level=${level}&rounds=${JSON.stringify(this.properties.game.rounds)}&action=edit`,
                    })
                } break;
                case 'addRound': {
                    wx.navigateTo({
                        url: `../editRound/editRound?gameId=${this.properties.game.objectId}&level=${level}&rounds=${JSON.stringify(this.properties.game.rounds)}&action=add`,
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
        /**
         * 以game中rounds为基础
         * 再根据currentRoundIndex和status生成带不同操作的盲注列表
         * properties中game、currentRoundIndex、status有改变，都强制触发此方法更新rounds
         */
        _generateRounds: function () {
            console.log(`rounds:_generateRounds`);
            if (this.properties.game && this.properties.game.rounds) {
                let rounds = [];
                for (let i = 0; i < this.properties.game.rounds.length; i++) {
                    let keys = [];//根据状态、当前盲注来确定的盲注操作 
                    switch (this.properties.status) {
                        case 'before': {
                            keys = ['startLevel', 'addRound', 'edit', 'delete'];
                        } break;
                        case 'gaming': {
                            if (i < this.properties.currentRoundIndex) {
                                keys = ['startLevel'];
                            } else if (i === this.properties.currentRoundIndex) {
                                keys = ['addRound', 'edit'];
                            } else if (i > this.properties.currentRoundIndex) {
                                keys = ['startLevel', 'addRound', 'edit', 'delete'];
                            }
                        } break;
                        case 'after': {
                            keys = ['startLevel', 'addRound', 'edit', 'delete'];
                        } break;
                    }
                    let actions = [];
                    for (let key of keys) {
                        actions.push({ key, lbl: ACTIONS_MAP.get(key) });
                    }
                    let round = { ...this.properties.game.rounds[i], id: i, open: false, actions };
                    rounds.push(round);
                }
                this.setData({
                    rounds: rounds
                }, function () {
                    console.log(`rounds:_generateRounds:setDataFinished:${JSON.stringify(this.data.rounds)}`);
                });
            }
        }
    }
})
