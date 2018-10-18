var Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
Page({
    /**
     * 页面的初始数据
     */
    data: {
        rounds: [],
        round: {},
        gameId: '',
        action: '',
        submitting: false//正在提交
    },
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        let gameId = options.gameId;
        let action = options.action;
        let level = parseInt(options.level);//option.level是字符串 转换为整形
        let rounds = JSON.parse(options.rounds);
        console.log(`editRound:onLoad:gameId:${gameId} level:${level} rounds:${rounds.length}`);

        //设置导航标题
        let title = '添加级别';
        if (action === 'edit')
            title = '编辑级别';
        wx.setNavigationBarTitle({
            title
        })
        //获取指定level的Round
        let round = rounds.find(function (value, index, arr) {
            return value.level === level;
        });
        if (round) {
            this.setData({ gameId, action, round, rounds });
        }
    },


    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },
    /**
     * 生命周期函数--监听页面卸载
     */
    formSubmit: function (e) {
        this.setData({ submitting: true })
        console.log('editRound:form:', e.detail.value)
        let value = e.detail.value;
        let round = this.data.round;
        let rounds = this.data.rounds;
        let action = this.data.action;
        //获取表单数据
        round.ante = parseInt(value.ante);
        round.smallBlind = parseInt(value.smallBlind);
        round.bigBlind = parseInt(value.bigBlind);
        round.duration = parseInt(value.duration);
        round.breakDuration = parseInt(value.breakDuration);
        //根据level获取到对应的round
        let index = rounds.findIndex(function (value, index, arr) {
            return value.level === round.level;
        });
        if (index != -1) {
            //如果是编辑 直接把目标级别替换掉可以。
            if (action === 'edit') {
                //替换
                rounds.splice(index, 1, round);
                //更新game
                this._updateGame(rounds);
            } else if (action === 'add') {
                //添加三部分
                //小于等于index 不处理
                //在index+1处 插入round 注意：round的level是未修改的
                //从index+1到结束 round的level加1 
                rounds.splice(index + 1, 0, round);//插入
                //index+1
                for (let i = index + 1; i < rounds.length; i++) {
                    rounds[i].level = rounds[i].level + 1;
                }
                //更新game
                this._updateGame(rounds);
            }
        }
    },
    _updateGame(rounds) {
        let game = new Game();
        game.id = this.data.gameId;
        console.log(`editRround:_updateGame:game.id:${game.id}`);
        //这两个属性不需要保存到服务器
        game.save({ rounds })
            .then(function (game) {
                console.log(`editRround:_updateGame::${JSON.stringify(game)}`);
                wx.navigateBack({
                    delta: 1
                });
            }, function (error) {
                console.log(`editRound:formSubmit:error:${JSON.stringify(error)}`)
            });
    }
})