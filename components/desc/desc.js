// components/desc/desc.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        game: {
            type: Object,
            value: undefined,
            observer:'_gameChange'
        },

    },

    /**
     * 组件的初始数据
     */
    data: {
    },

    lifetimes: {
        // 生命周期函数，可以为函数，或一个在methods段中定义的方法名
        attached: function () {

            console.log(`desc:attached:game:${JSON.stringify(this.properties.game)}`);
        },
        ready: function () {

            console.log(`desc:ready:game:${JSON.stringify(this.properties.game)}`);
        },
        moved: function () {

            console.log(`desc:moved:`);
        },
        detached: function () {

            console.log(`desc:detached:`);
        },
    },

    /**
     * 组件的方法列表
     */
    methods: {
        bindActionTap: function (e) {
            let action = e.currentTarget.dataset.action;
            let props = e.currentTarget.dataset.props;
            console.log(`desc:bindActionTap:action:${action} props:${props}`);
            this.triggerEvent('actionTap', { action, props });
        },
        handlerChange: function (e) {
            console.log(`desc:handlerChange:action:${JSON.stringify(e)}`);

            let props = e.currentTarget.dataset.props;
            let action;
            switch (e.detail.type) {
                case 'plus':
                    action = 'add';
                    break;
                case 'minus':
                    action = 'subtract';
                    break;
                default:
                    break;
            }
            console.log(`desc:bindActionTap:action:${action} props:${props}`);
            if (action && props)
                this.triggerEvent('actionTap', { action, props });
        },
        _gameChange(newGame, oldGame) {
            console.log(`rounds:_gameChange:newGame:${JSON.stringify(newGame)}`);
            // let rebuy = newGame.rebuy;
            // let addon = newGame.addon;
            // this.setData({ rebuy, addon });
            // this._generateRounds();
        },
    }
})
