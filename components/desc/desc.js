// components/desc/desc.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        game: {
            type: Object,
            value: undefined
        }
    },

    /**
     * 组件的初始数据
     */
    data: {

    },

    /**
     * 组件的方法列表
     */
    methods: {
        bindActionTap: function (e) {
            let action = e.currentTarget.dataset.action;
            let props = e.currentTarget.dataset.props;
            console.log(`desc:bindActionTap:action:${action} props:${props}`)
            this.triggerEvent('actionTap', { action,props });
        }
    }
})
