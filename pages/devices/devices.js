// pages/devices/devices.js
let Parse = require('../../parse');
let DeviceUser = Parse.Object.extend("DeviceUser");
let Game = Parse.Object.extend("Game");
Page({

    /**
     * 页面的初始数据
     */
    data: {

        gameIndex: -1,
        loading: false,
        deviceUsers: [],
        needReload: false,//子page返回时 重新加载数据 

        //左滑开关
        toggles: [],
        oldExpanded: false,//右滑是否打开
        nextExpanded: false,
        soDeviceUser: null,//正在右滑的deviceUser
        //ActionSheet相关
        asVisible: false,
        asContent: '',
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
        this._fetchDeviceUsers();
    },
    /**
         * 生命周期函数--监听页面显示
         */
    onShow: function () {
        if (this.data.needReload) {
            this._fetchDeviceUsers();
            // this.setData({ needReload: false });
        }
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },
    /**
     * 扫描添加屏幕
     */
    bindScanTap: function (e) {
        let that = this;
        wx.scanCode({
            success: (res) => {
                console.log(`devices:bindScanTap:uuid:${res.result}`);
                let uuid = res.result;
                that._bindDeviceToUser(uuid)
            }
        })
    },

    /**
     * 单击有两种操作
     * 如果是展开状态，关闭展开
     * 如果是关闭状态，跳转
     */
    soCotentTapAction: function (e) {
        console.log(`devices:soCotentTapAction:oldExpanded:${this.data.oldExpanded} nextExpanded:${this.data.nextExpanded}`);
        let oldExpanded = this.data.oldExpanded;
        let nextExpanded = this.data.nextExpanded;

        //因为swipeout的Touchstart,Touchmove,Touchend顺序执行完之后才会执行到content的Tap事件，
        //swipeout在touchend中通过前两个方法中产生的数据计算当前操作是展开还是关半，因此expanded状态的值也是在touchend中改变的
        //因此只有oldExpanded和nextExpanded都为false时，才能说明这个swipeout是真正关闭的，才能跳转
        if (oldExpanded == false && nextExpanded == false) {
            let objectId = e.currentTarget.dataset.deviceUser;
            //跳转到editDeviceGame
            wx.navigateTo({
                url: `../editDeviceGame/editDeviceGame?deviceUserId=${objectId}`,
            })

            this.setData({
                asVisible: false,
                asContent: '',
                soDeviceUser: null,
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
        console.log(`devices:onExpandedChange:old:${old} next:${next} toggles:${this.data.toggles}`);
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
            soDeviceUser: null,
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

        let deviceUser = this.data.soDeviceUser;
        let device = deviceUser.get('device');
        let that = this;
        this._unbindDeviceToUser(device.get('uuid')).then(function (deviceUser) {
            //不在转圈
            actions[index].loading = false;
            that.setData({
                asVisible: false,
                asContent: '',
                soDeviceUser: null,
                asActions: actions,
            });
            that._fetchDeviceUsers();
        }).catch(function (error) {
            //不在转圈
            actions[index].loading = false;
            that.setData({
                asVisible: false,
                asContent: '',
                soDeviceUser: null,
                asActions: actions,
            });
            that._closeAllSwipeout();
        });
    },

    /**
     * swipeOut的选项点击事件
     */
    soItemTapAction: function (e) {
        let action = e.currentTarget.dataset.action;
        let objectId = e.currentTarget.dataset.deviceUser;
        console.log(`devices:soItemTapAction:action:${JSON.stringify(action)} objectId:${JSON.stringify(objectId)}`);
        switch (action) {
            case 'delete':
                //找
                let deviceUser = this.data.deviceUsers.find(function (value) {
                    return value.id === objectId;
                });
                let device = deviceUser.get('device');
                let game = device.get('game');
                console.log(`devices:soItemTapAction:game:${JSON.stringify(game)} `);
                let content = `你确定要删除${device.get('uuid')}吗？`;
                if (game) {
                    content = `这个大屏幕绑定了比赛[${game.get('title')}],${content}`
                }
                this.setData({
                    asVisible: true,
                    asContent: content,
                    soDeviceUser: deviceUser
                });
                break;
            case 'name':
                //跳转到editDevice的编辑界面
                wx.navigateTo({
                    url: `../editDeviceTitle/editDeviceTitle?deviceUserId=${objectId}`,
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
        console.log(`devices:_closeAllSwipeoutExcept:index:${index} toggles:${this.data.toggles}`);
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
        console.log(`devices:_closeAllSwipeout:toggles:${this.data.toggles}`);
        let toggles = this.data.toggles;
        for (let i = 0; i < toggles.length; i++) {
            toggles[i] = toggles[i] ? false : true;;
        }
        this.setData({ toggles });
    },

    /**
     * 
     * @param {*} dusers 
     * @param {*} gameIds 
     * @param {*} that 
     */
    _fetchDeviceUserWithGame: function (deviceUsers, gameIds, that) {
        console.log(`devices:_fetchDeviceUserWithGame:gameIds:${JSON.stringify(gameIds)}`);
        let gameQuery = new Parse.Query(Game);
        gameQuery.select("title");
        gameQuery.containsAll("objectId", gameIds);
        return gameQuery.find().then(function (games) {
            let deviceUsersForView = [];
            for (let i = 0; i < deviceUsers.length; i++) {
                const deviceUser = deviceUsers[i];
                let device = deviceUser.get('device');

                //微信wxml中只能获取子 不能获取孙 
                //先初始化要显示出来的label
                let label = '未显示比赛';
                let game = device.get('game');
                if (game) {
                    game = games.find(function (value) {
                        return value.id === game.id;
                    });
                    if (game)
                        label = game.get('title');
                }

                console.log(`devices:_fetchDeviceUsers:label:${JSON.stringify(label)}`);
                let uuid = device.get('uuid');
                let title = `${deviceUser.get('title')} [${uuid}]`;

                let deviceUserForView = { objectId: deviceUser.id, id: deviceUser.id, uuid, label, title };
                deviceUsersForView.push(deviceUserForView);
            }

            console.log(`devices:_fetchDeviceUsers:deviceUsers:${deviceUsers.length}`);
            //初始化toggles为全部关闭
            let toggles = [];
            deviceUsers.forEach(item => {
                toggles.push(false);
            });

            that.setData({
                loading: false,
                deviceUsers,
                deviceUsersForView,
                needReload: false,
                toggles
            });

        }).catch(function (error) {
            console.log(`devices:_fetchDeviceUserWithGame:error:${error}`);
        });
    },
    /**
     * 如果所有屏幕都没有显示game 就不用单独获取game的名称了
     * @param {*} dusers 
     * @param {*} that 
     */
    _fetchDeviceUserNoGame: function (deviceUsers, that) {

        let deviceUsersForView = [];
        for (let i = 0; i < deviceUsers.length; i++) {
            const deviceUser = deviceUsers[i];
            let device = deviceUser.get('device');
            //微信wxml中只能获取子 不能获取孙 
            //先初始化要显示出来的label
            let label = '未显示比赛';
            let uuid = device.get('uuid');

            let title = `${deviceUser.get('title')} [${uuid}]`;


            let deviceUserForView = { objectId: deviceUser.id, id: deviceUser.id, uuid, label, title };
            deviceUsersForView.push(deviceUserForView);
        }
        //初始化toggles为全部关闭
        let toggles = [];
        deviceUsers.forEach(item => {
            toggles.push(false);
        });

        that.setData({
            loading: false,
            deviceUsers,
            deviceUsersForView,
            needReload: false,
            toggles
        });

    },
    /**
     * 获取DevicesUser列表
     */
    _fetchDeviceUsers: function () {
        this.setData({
            loading: true,
        });
        let that = this;
        console.log(`devices:_fetchDeviceUsers`);
        //获取DeviceUser列表
        let query = new Parse.Query(DeviceUser);
        query.descending('createdAt');
        query.include('device');
        query.equalTo('user', Parse.User.current());
        query.find().then(function (deviceUsers) {
            let gameIds = [];
            for (let i = 0; i < deviceUsers.length; i++) {
                const deviceUser = deviceUsers[i];
                let game = deviceUser.get('device').get('game');
                if (game)
                    gameIds.push(game.id);
            }
            console.log(`devices:_fetchDeviceUsers:gameIds:${gameIds}`);
            if (gameIds) {
                return that._fetchDeviceUserWithGame(deviceUsers, gameIds, that);
            } else {
                return that._fetchDeviceUserNoGame(deviceUsers, that);
            }
        });
    },


    /**
     * wxml中wx:for如果传Parse Object
     * 凡是通过object.get('name')来获取的数据都可能为空 还会报Expect FLOW_CREATE_NODE but get another错误
     * 所以重新生成一gamesForView数组，专门用于wxml中显示使用
     */
    _createDeviceUsersForView: function (deviceUsers) {
        let deviceUsersForView = [];
        deviceUsers.forEach(item => {
            //因为wxml不能直接格式化date对像 但在wxs中可以用毫秒数
            //添加startTimeMills字段，根据startTime的getTime()生成startTimeMills 
            deviceUsersForView.push({ objectId: item.id, id: item.id, title: item.get('title'), subTitle: item.get('subTitle'), startTime: item.get('startTime'), startTimeMills: item.get('startTime').getTime() })
        });
        return deviceUsersForView;
    },

    /**
     * 绑定大屏幕到当前用户
     * @param {*} uuid 
     */
    _bindDeviceToUser(uuid) {
        console.log(`devices: bindDeviceToUser:uuid:${uuid}`);
        let that = this;
        let _device;
        let query = new Parse.Query('Device');
        query.equalTo('uuid', uuid);
        //判断这个大屏幕是不是存在
        query.first().then(function (device) {
            console.log(`devices: bindDeviceToUser:device:${device}`);
            if (!device) {
                return Parse.Promise.error("这个大屏幕不存在。");
            } else {
                _device = device;
                let query = new Parse.Query('DeviceUser');
                query.equalTo('device', device);
                return query.first();
            }
        }).then(function (deviceUser) {
            //判断这个大屏幕是否已经和用绑定
            //如果为空 新建绑定
            if (!deviceUser) {
                let DeviceUser = Parse.Object.extend("DeviceUser");
                let deviceUser = new DeviceUser();
                deviceUser.set('user', Parse.User.current());
                deviceUser.set('device', _device);
                return deviceUser.save();
            }
            //不为空 说明已经绑定
            else {
                return Parse.Promise.error("这个大屏幕已经绑定。");
            }
        }).then(function (deviceUser) {
            console.log(`devices: bindDeviceToUser:game:${JSON.stringify(deviceUser)}`);
            //重新获取device进行更新
            that._fetchDeviceUsers();
        }, function (error) {
            console.log(`devices: bindDeviceToUser:error:${error}`);
            wx.showModal({ content: error, showCancel: false, confirmText: `我知道了` });
        })
    },
    /**
     * 解除当前用户指定大屏幕的绑定
     * 返回是Promise
     * @param {*} uuid 
     */
    _unbindDeviceToUser(uuid) {
        let that = this;
        let _device;
        let query = new Parse.Query('Device');
        query.equalTo('uuid', uuid);
        //判断这个大屏幕是不是存在
        return query.first().then(function (device) {
            console.log(`devices:unbindDeviceToUser:device:${device.get('uuid')}`);
            if (!device) {
                return Parse.Promise.error("这个大屏幕不存在。");
            } else {
                _device = device;
                let query = new Parse.Query('DeviceUser');
                query.equalTo('device', device);
                query.include('device');
                return query.first();
            }
        }).then(function (deviceUser) {
            //如果为空 说明没有绑定
            if (!deviceUser) {
                return Parse.Promise.error("这个大屏幕没有和您绑定。");
            }
            //不为空 说明已经绑定 
            else {
                //判断这个device是否绑定了GAME
                if (_device.get('game')) {
                    // return Parse.Promise.error("这个大屏幕绑定了Game，无法解绑。");
                    that._unbindDeviceToGame(_device, _device.get('game'));
                    return deviceUser.destroy();
                } else {
                    return deviceUser.destroy();
                }
            }
        })
    },
    /**
     * 解除绑定到Game的大屏幕
     * @param {*} uuid
     */
    _unbindDeviceToGame(device, game) {
        console.log(`devices:_unbindDeviceToGame:uuid:${device.get('uuid')} game:${game.objectId}`);
        device.set('game', null);
        return device.save().then(function (device) {
            console.log(`devices:_unbindDeviceToGame:device2:${JSON.stringify(device)}`);
            let screens = game.get('screens');
            if (screens) {
                //看看存不存在
                let index = screens.findIndex(function (value, index, arr) {
                    return value.id === device.id;
                });
                //如果存在 删除后保存
                if (index != -1) {
                    screens.splice(index, 1);
                    game.set('screens', screens);
                    //判断还有没有screens 如果已经没有了 删除screen（角色)读取此game的权限
                    let gameAcl = game.get('ACL');
                    gameAcl.setRoleReadAccess('screen', false);
                    gameAcl.setRoleWriteAccess('screen', false);
                    return game.save();
                }
            }
        }).then(function (game) {
            console.log(`devices:_unbindDeviceToGame:device:${device.get('uuid')} game:${game.get('title')} `);
        }, function (error) {
            console.log(`devices:_unbindDeviceToGame:error:${error}`);
        })
    },
})