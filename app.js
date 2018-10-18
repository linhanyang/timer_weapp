//app.js
App({
    onShow: function (options) {
        // Do something when show.
    },
    onHide: function () {
        // Do something when hide.
    },
    onError: function (msg) {
        console.log(msg)
    },
    onLaunch: function (options) {
        console.log(`app:onLaunch:${JSON.stringify(options)}`);

        //初始化parse
        var Parse = require('parse');
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

        // var currentUser = Parse.User.current();
        // if (currentUser) {
        //     console.log(`app:currentUser:${currentUser.get('username')}`)
        // } else {
        //     Parse.User.logIn("admin1", "1", {
        //         success: function (user) {
        //             console.log(`app:lgoin:${user.get('username')}`)
        //         },
        //         error: function (user, error) {
        //         }
        //     });
        // }

        // Parse.Cloud.run('hello2', {}).then(function (result) {
        //     console.log(`app:hello2:${result}`)
        // })

        let that = this;
        let currentUser = Parse.User.current();
        if (currentUser) {
            console.log(`app:currentUser:${currentUser.get('username')}`)
        } else {
            // 登录
            wx.login({
                success: res => {
                    //发送 res.code 到后台换取 openId, sessionKey, unionId
                    console.log(`app:code:${res.code}`);
                    // var code = res.code
                    this.globalData.code = res.code
                    let code = res.code;
                    Parse.Cloud.run('weappAuthOnlyCode', { code })
                        .then(function (user) {
                            return Parse.User.become(user.get('sessionToken'));
                        }).then(function (user) {
                            console.log(`app:currentUser:${Parse.User.current().get('username')}`)
                            // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
                            // 所以此处加入 callback 以防止这种情况
                            if (that.userInfoReadyCallback) {
                                that.userInfoReadyCallback(user)
                            }
                        }, function (error) {
                            console.error(`app:weappAuthOnlyCode:${error}`)
                        });
                }
            });
        }



        // // 获取用户信息
        // wx.getSetting({
        //     success: res => {
        //         console.log(`app:getSetting:${JSON.stringify(res)}`);
        //         if (res.authSetting['scope.userInfo']) {
        //             // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
        //             wx.getUserInfo({
        //                 success: res => {
        //                     console.log(`app:getUserInfo:${code}`);
        //                     // 可以将 res 发送给后台解码出 unionId
        //                     this.globalData.userInfo = res.userInfo
        //                     var userinfo = { ...res.userInfo, code };

        //                     Parse.Cloud.run('weappauth', userinfo).then(function (user) {
        //                         return Parse.User.become(user.sessionToken)
        //                     }).then(function (user) {
        //                         console.log(`currentUser:${Parse.User.current().get('nickName')}`)
        //                     }, function (error) {
        //                         console.error(`weappauth:${error}`)
        //                     });

        //                     // // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
        //                     // // 所以此处加入 callback 以防止这种情况
        //                     // if (this.userInfoReadyCallback) {
        //                     //     this.userInfoReadyCallback(res)
        //                     // }
        //                 }
        //             })
        //         }
        //     }
        // })
    },
    globalData: {
        userInfo: null
    }
})