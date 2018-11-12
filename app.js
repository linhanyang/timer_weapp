//app.js

var Parse = require('parse');
App({

    globalData: {
        userInfo: null
    },

    onShow: function (options) {
        console.log(`app:onShow:options:${options}`);
        // Do something when show.
    },
    onHide: function () {
        console.log(`app:onHide`);
        // Do something when hide.
    },
    onError: function (msg) {
        console.log(`app:onError:${msg}`);
    },
    onLaunch: function (options) {
        console.log(`app:onLaunch:options:${options}`);

        //初始化parse
        Parse.initialize('timer');
        //正式服 腾讯云容器服务
        Parse.serverURL = 'https://www.hulupoker.com/parse/';
        Parse.liveQueryServerURL = 'wss://www.hulupoker.com/parse/';

        // 本地docker测试 没有https
        // Parse.serverURL = 'http://127.0.0.1:1337/parse/';
        // Parse.liveQueryServerURL = 'ws://127.0.0.1:1337/parse/';

        //本地docker测试 加了nginx 有https 
        // Parse.serverURL = 'https://127.0.0.2/parse/';
        // Parse.liveQueryServerURL = 'wss://127.0.0.2/parse/';


        // Parse.serverURL = 'https://127.0.0.2/parse/';
        // Parse.liveQueryServerURL = 'wss://127.0.0.2/parse/'

        //如果当前用户存在 logout 方便测试
        var currentUser = Parse.User.current();
        if (currentUser) {
            // do stuff with the user
            Parse.User.logOut();
            console.log(`app:onLaunch:logOut`)
        }
        /**
         * 1、登录
         * 2、获取用户信息
         * 3、处理下一页面
         */
        let that = this;
        wx.login({
            success: res => {
                //发送 res.code 到后台换取 openId, sessionKey, unionId
                console.log(`app:onLaunch:res:code:${res && res.code}`);
                // var code = res.code
                this.globalData.code = res.code
                let code = res.code;
                Parse.Cloud.run('weappAuthOnlyCode', { code })
                    .then(function (user) {
                        return Parse.User.become(user.get('sessionToken'));
                    }).then(function (user) {
                        console.log(`app:onLaunch:currentUser:${Parse.User.current().get('username')}`)
                        // 由于Parse操作是网络请求，可能会在 Page.onLoad 之后才返回
                        // 所以此处加入 callback 以防止这种情况
                        if (that.userReadyCallback) {
                            that.userReadyCallback(user)
                        }
                    }).catch(function (error) {
                        console.error(`app:weappAuthOnlyCode:error:${error}`)
                    });
            }
        });
    },
})