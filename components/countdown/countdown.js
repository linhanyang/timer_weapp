const util = require('../../utils/util.js')
let interval;
Component({
    externalClasses: ['game__countdown'],
    /**
     * 组件的属性列表
     */
    properties: {
        game: {
            type: Object,
            value: undefined,
            observer: '_gameChange'
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        rounds: [],//盲注列表
        countdown: '00:00',//倒计时字符串
        currentRoundIndex: -1,//当前正在运行round的index,
        breaking: false,//是否在休息阶段
        status: '',//比赛状态 'before' 'gaming' 'after'
    },
    // 生命周期函数，可以为函数，或一个在methods段中定义的方法名
    created: function () {
        console.log(`countdown:created`);
    },
    attached: function () {
        console.log(`countdown:attached`);
    },
    ready: function () {
        console.log(`countdown:ready:this.game:${JSON.stringify(this.properties.game)}`);
        this._getCountdown();
        if (this.properties.game && !this.properties.game.pauseTime) {
            interval = setInterval(() => this._getCountdown(), 980);
        }
    },
    moved: function () {
        console.log(`countdown:moved`);
    },
    detached: function () {
        console.log(`countdown:detached`);
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    },
    /**
     * 组件的方法列表
     */
    methods: {
        _gameChange(newGame, oldGame) {
            console.log(`countdown:_gameChange:newGame:${newGame && JSON.stringify(newGame)}`);
            if (newGame && newGame.rounds) {
                //如果是暂停
                if (newGame && newGame.pauseTime) {
                    if (this.data.interval) {
                        clearInterval(interval);
                        interval = null;
                    }
                } else {
                    //如果不是 开始计时
                    if (!interval) {
                        interval = setInterval(() => this._getCountdown(), 980);
                    }
                }

                this.setData({ rounds: [...this._appendRoundStartTime(newGame)] },
                    function () {
                        console.log(`countdown:setDataFinished:rounds`);
                    });
            }
        },
        /**
         * 
         */
        tapStartImmediate(e) {
            console.log(`countDown:tapStartImmediate`);
            this.triggerEvent('startImmediate', {});
        },
        tapPause(e) {
            console.log(`countDown:tapPause`);
            this.triggerEvent('pause', {});
        },
        tapResume(e) {
            console.log(`countDown:tapResume`);
            this.triggerEvent('resume', {});
        },
        /**
         * 根据game的startTime 生成rounds中每个round的开始时间 用于倒计时
         */
        _appendRoundStartTime(game) {
            let rounds = [];
            if (game) {
                // console.log(`countDown:_appendRoundStartTime():game:startTime:${game.startTimeMills} `);
                let startTime = game.startTimeMills;
                for (let round of game.rounds) {
                    rounds.push({ ...round, startTime });
                    // console.log(`countDown:_appendRoundStartTime():level:${round.level} startTime:${startTime} `);
                    if (!round.breakDuration || round.breakDuration === 0) {
                        startTime = startTime + round.duration * 60 * 1000;
                    } else {
                        startTime = startTime + (round.duration + round.breakDuration) * 60 * 1000;
                    }
                }
            }
            return rounds;
        },

        /**
         * 获取倒计时
         */
        _getCountdown() {
            //判断是不是暂停 如果有值 是在暂停
            let pauseTime = this.properties.game.pauseTimeMills;
            let dateTime;//需要对比的时间 暂停取暂停时间 没有暂停直接取当前时间
            //没有暂停取当前值
            if (pauseTime) {
                dateTime = pauseTime;
            } else {
                dateTime = new Date().getTime();
            }
            // console.log(`countDown:_getCountdown():dateTime:${dateTime} `);


            let currentRoundIndex = -1;
            let status = 'before';
            let breaking = false;
            let countdown = '00:00';
            if (this.data.rounds) {
                for (var i = 0; i < this.data.rounds.length; i++) {
                    var round = this.data.rounds[i];
                    var time = dateTime - round.startTime;
                    // console.log(`countDown:getCountdown():i:${i} time:${time} round.startTime:${round.startTime}`);
                    if (i == 0) {
                        //尚未开始
                        if (time < 0) {
                            status = 'before';
                            countdown = util.formatCountdown(0 - time);
                            currentRoundIndex = i;
                            break;
                        } else {
                            //判断是否执行的当前round
                            if (time >= 0) {
                                //没有round.breakDuration
                                if (!round.breakDuration || round.breakDuration === 0) {
                                    if (time <= round.duration * 60 * 1000) {
                                        countdown = util.formatCountdown(round.duration * 60 * 1000 - time);
                                        status = 'gaming';
                                        breaking = false;
                                        currentRoundIndex = i;
                                        break;
                                    }
                                }
                                else {
                                    //有round.breakDuration 就要判断是正在执行round.duration还是正执行round.breakDuration
                                    if (time <= (round.duration + round.breakDuration) * 60 * 1000) {
                                        if (time <= round.duration * 60 * 1000) {
                                            countdown = util.formatCountdown(round.duration * 60 * 1000 - time);
                                            breaking = false;
                                        } else if (time < (round.duration + round.breakDuration) * 60 * 1000) {
                                            countdown = util.formatCountdown((round.duration + round.breakDuration) * 60 * 1000 - time);
                                            breaking = true;
                                        }
                                        status = 'gaming';
                                        currentRoundIndex = i;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    else {
                        //判断是否执行的当前round
                        if (time >= 0) {
                            //没有round.breakDuration
                            if (!round.breakDuration || round.breakDuration === 0) {
                                if (time <= round.duration * 60 * 1000) {
                                    countdown = util.formatCountdown(round.duration * 60 * 1000 - time);
                                    status = 'gaming';
                                    breaking = false;
                                    currentRoundIndex = i;
                                    break;
                                }
                            }
                            else {
                                //有round.breakDuration 就要判断是正在执行round.duration还是正执行round.breakDuration
                                if (time <= (round.duration + round.breakDuration) * 60 * 1000) {
                                    if (time <= round.duration * 60 * 1000) {
                                        countdown = util.formatCountdown(round.duration * 60 * 1000 - time);
                                        breaking = false;
                                    } else if (time < (round.duration + round.breakDuration) * 60 * 1000) {
                                        countdown = util.formatCountdown((round.duration + round.breakDuration) * 60 * 1000 - time);
                                        breaking = true;
                                    }
                                    status = 'gaming';
                                    currentRoundIndex = i;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            //比赛已经结束
            if (currentRoundIndex == -1) {
                status = 'after';
                countdown = '00:00';
                currentRoundIndex = this.data.rounds.length - 1;
            }

            // console.log(`countDown:getCountdown():status:${status} countdown:${countdown} currentRoundIndex:${currentRoundIndex}`);
            //级别变化  重新渲染 同时发事件通知page更新
            if (this.data.currentRoundIndex != currentRoundIndex) {
                this.setData({ currentRoundIndex });
                this.triggerEvent('currentRoundIndexChange', { currentRoundIndex });
            }
            //状态变化  重新渲染 同时发事件通知page更新
            if (this.data.status != status) {
                this.setData({ status });
                this.triggerEvent('statusChange', { status });
            }

            if (this.data.breaking != breaking) {
                this.setData({ breaking });
                this.triggerEvent('breakingChange', { breaking });
            }

            this.setData({
                countdown
            });


            //如果已经结束 停止倒计时 
            if (status === 'after') {
                if (interval) {
                    clearInterval(interval);
                    interval = null;
                }
            }
        }
    }
})
