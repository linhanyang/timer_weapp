// components/desc/desc.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        game: {
            type: Object,
            value: undefined,
            observer: '_gameChange'
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

            console.log(`desc:attached:game:${this.properties.game && this.properties.game.title}`);
        },
        ready: function () {

            console.log(`desc:ready:game:${this.properties.game && this.properties.game.title}}`);
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
            let value = e.detail.value;
            let action;
            switch (e.detail.type) {
                case 'plus':
                    action = 'add';
                    break;
                case 'minus':
                    action = 'subtract';
                    break;
                case undefined:
                    action = 'change';
                default:
                    break;
            }
            console.log(`desc:bindActionTap:action:${action} value:${value} props:${props}`);
            if (action && props)
                this.triggerEvent('actionTap', { action, value, props });
        },

        handlerChipsChange: function (e) {
            let chipss = this.properties.game.chipss;
            let index = e.currentTarget.dataset.index;
            let chips = chipss[index];
            console.log(`desc:handlerChange:index:${index}`);
            let count;
            switch (e.detail.type) {
                case 'plus': {
                    count = chips ? chips.count : undefined;
                    if (count)
                        count = count + 1;
                    else
                        count = 1;
                } break;
                case 'minus': {
                    count = chips ? chips.count : undefined;
                    if (count)
                        count = count - 1;
                    else
                        count = 0;
                    if (count < 0)
                        count = 0;
                } break;
                case undefined:
                    count = e.detail.value;
                default:
                    break;
            }
            chips = { ...chips, count };//赋值
            chipss.splice(index, 1, chips);//替换
            console.log(`desc:bindActionTap:chipss:${chipss}`);
            this.triggerEvent('actionTapChips', { chipss });
        },
        _gameChange(newGame, oldGame) {
            console.log(`rounds:_gameChange:newGame:${newGame.title}`);
        },
    }
})
