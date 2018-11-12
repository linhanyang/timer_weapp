// pages/devices/devices.js
let Parse = require('../../parse');
let DeviceRole = Parse.Object.extend("DeviceRole");
let sDeviceRoles;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        loading: false,
        deviceRoles: [],
        needReload: false,//子page返回时 重新加载数据 

        //左滑开关
        toggles: [],
        oldExpanded: false,//右滑是否打开
        nextExpanded: false,
        soDeviceRole: null,//正在右滑的deviceRole
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
        this._fetchDeviceRoles();
        this._subscribeDeviceRole();
    },
    /**
         * 生命周期函数--监听页面显示
         */
    onShow: function () {
        if (this.data.needReload) {
            this._fetchDeviceRoles();
            this.setData({ needReload: false });
        }
    },
    onPullDownRefresh: function () {
        this._fetchDeviceRoles();
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        if (sDeviceRoles) {
            sDeviceRoles.unsubscribe();
        }
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
                that._bindDeviceToRole(uuid)
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
            let objectId = e.currentTarget.dataset.deviceRole;
            //跳转到editDeviceGame
            wx.navigateTo({
                url: `../editDeviceGame/editDeviceGame?deviceRoleId=${objectId}`,
            })

            this.setData({
                asVisible: false,
                asContent: '',
                soDeviceRole: null,
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
            soDeviceRole: null,
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

        let deviceRole = this.data.soDeviceRole;
        let device = deviceRole.get('device');
        let that = this;
        this._unbindDeviceToRole(device.get('uuid')).then(function (deviceRole) {
            //不在转圈
            actions[index].loading = false;
            that.setData({
                asVisible: false,
                asContent: '',
                soDeviceRole: null,
                asActions: actions,
            });
            //如果解绑成功通过监听更新界面  不需要再重新获取
            // that._fetchDeviceRoles();
        }).catch(function (error) {
            //不在转圈
            actions[index].loading = false;
            that.setData({
                asVisible: false,
                asContent: '',
                soDeviceRole: null,
                asActions: actions,
            });
            that._closeAllSwipeout();

            console.log(`devices: handleASItemClick:_bindDeviceToRole:error:${error}`);
            wx.showModal({ content: error, showCancel: false, confirmText: `我知道了` });
        });
    },

    /**
     * swipeOut的选项点击事件
     */
    soItemTapAction: function (e) {
        let action = e.currentTarget.dataset.action;
        let objectId = e.currentTarget.dataset.deviceRole;
        console.log(`devices:soItemTapAction:action:${action} objectId:${objectId}`);
        switch (action) {
            case 'delete':
                //找
                let deviceRole = this.data.deviceRoles.find(function (value) {
                    return value.id === objectId;
                });
                let device = deviceRole.get('device');
                let game = device.get('game');
                console.log(`devices:soItemTapAction:game:${game && game.get('title')} `);
                let content = `你确定要删除${device.get('uuid')}吗？`;
                if (game) {
                    content = `这个大屏幕绑定了比赛[${game.get('title')}],${content}`
                }
                this.setData({
                    asVisible: true,
                    asContent: content,
                    soDeviceRole: deviceRole
                });
                break;
            case 'name':
                //跳转到editDevice的编辑界面
                wx.navigateTo({
                    url: `../editDeviceTitle/editDeviceTitle?deviceRoleId=${objectId}`,
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
     * 获取DeviceRole列表
     */
    _fetchDeviceRoles: function () {
        this.setData({
            loading: true,
        });
        let that = this;
        console.log(`devices:_fetchDeviceRoles`);
        //用户取消分享他人权限会触发curRole的修改
        //但Parse.User.current()不会重新获取  所以fetch一下curUser
        let curUser = Parse.User.current();
        curUser.fetch().then(function (user) {
            //获取DeviceRole列表
            let query = new Parse.Query(DeviceRole);
            query.descending('createdAt');
            query.include(['device.game']);//多级包含 好用
            query.equalTo('role', user.get('curRole'));
            return query.find();
        }).then(function (deviceRoles) {
            console.log(`devices:_fetchDeviceRoles:deviceRoles:${deviceRoles && deviceRoles.length}`);
            let deviceRolesForView = [];
            for (let i = 0; i < deviceRoles.length; i++) {
                const deviceRole = deviceRoles[i];
                let device = deviceRole.get('device');
                //微信wxml中只能获取子 不能获取孙 
                //先初始化要显示出来的label
                let label = '未显示比赛';
                let game = device.get('game');
                if (game) {
                    label = game.get('title');
                }
                console.log(`devices:_fetchDeviceRoles:label:${label}`);
                let uuid = device.get('uuid');
                let title = `${deviceRole.get('title')} [${uuid}]`;
                let deviceRoleForView = { objectId: deviceRole.id, id: deviceRole.id, uuid, label, title };
                deviceRolesForView.push(deviceRoleForView);
            }
            //初始化toggles为全部关闭
            let toggles = [];
            deviceRoles.forEach(item => {
                toggles.push(false);
            });
            //关闭下拉刷新的动画
            wx.stopPullDownRefresh()
            that.setData({
                loading: false,
                deviceRoles,
                deviceRolesForView,
                needReload: false,
                toggles
            });
        });
    },


    /**
     * 绑定大屏幕到当前用户的curRole
     * @param {*} uuid 
     */
    _bindDeviceToRole(uuid) {
        console.log(`devices: _bindDeviceToRole:uuid:${uuid}`);
        let that = this;
        let _device;
        let query = new Parse.Query('Device');
        query.equalTo('uuid', uuid);
        //判断这个大屏幕是不是存在
        query.first().then(function (device) {
            _device = device;
            console.log(`devices: _bindDeviceToRole:device:${device && device.get('uuid')}`);
            if (!device) {
                return Parse.Promise.error("这个大屏幕不存在。");
            } else {
                let query = new Parse.Query('DeviceRole');
                query.equalTo('device', device);
                query.include('role');
                return query.first();
            }
        }).then(function (dr) {
            //判断这个大屏幕是否已经和当前用户的curRole绑定
            if (dr) {
                let role = dr.get('role');
                let curRole = Parse.User.current().get('curRole');
                console.log(`devices: _bindDeviceToRole:role:${role && role.get('name')} curRole:${curRole && curRole.get('name')}`);
                if (role && role.get('name') == curRole.get('name')) {
                    //如果和当前用户绑定 直接报错
                    return Parse.Promise.error("这个大屏幕已经和你绑定。无须再次绑定。");
                } else {
                    //如果和其它用户绑定 直接解绑
                    //一定要return 不然就不是同步了
                    return that._unbindDeviceToRole(uuid).then(function (dr) {
                        if (dr) {
                            let device = dr.get('device');
                            let role = dr.get('role')
                            console.log(`devices: _bindDeviceToRole:_unbindDeviceToRole:deviceRole:device:${device && device.id} role:${role && role.id}`);
                        } else {
                            console.log(`devices: _bindDeviceToRole:_unbindDeviceToRole:deviceRole:${dr}`);
                        }
                        let DeviceRole = Parse.Object.extend("DeviceRole");
                        let deviceRole = new DeviceRole();
                        deviceRole.set('role', curRole);
                        deviceRole.set('device', _device);
                        return deviceRole.save();
                    })
                }
            } else {
                //没有绑定任何一个，直接保存
                let DeviceRole = Parse.Object.extend("DeviceRole");
                let deviceRole = new DeviceRole();
                deviceRole.set('role', Parse.User.current().get('curRole'));
                deviceRole.set('device', _device);
                return deviceRole.save();
            }
        }).then(function (deviceRole) {
            if (deviceRole) {
                let device = deviceRole.get('device');
                let role = deviceRole.get('role')
                console.log(`devices: _bindDeviceToRole:deviceRole:device:${device && device.id} role:${role && role.id}`);
            } else {
                console.log(`devices: _bindDeviceToRole:deviceRole:${deviceRole}`);
            }
            //不在获取了 因为已经加了监听 监听负责更新
            //重新获取device进行更新 
            // that._fetchDeviceRoles();
        }).catch(function (error) {
            console.log(`devices: _bindDeviceToRole:error:${error}`);
            wx.showModal({ content: error, showCancel: false, confirmText: `我知道了` });
            //重新获取device进行更新
            that._fetchDeviceRoles();
        });
    },


    /**
     * 解除当前用户指定大屏幕的绑定
     * 返回是Promise
     * @param {*} uuid 
     */
    _unbindDeviceToRole(uuid) {
        let that = this;
        let query = new Parse.Query('Device');
        query.equalTo('uuid', uuid);
        //判断这个大屏幕是不是存在
        return query.first().then(function (device) {
            console.log(`devices:_unbindDeviceToRole:device:${device && device.get('uuid')}`);
            if (!device) {
                return Parse.Promise.error("这个大屏幕不存在。");
            } else {
                //判断有没有绑定
                let query = new Parse.Query('DeviceRole');
                query.equalTo('device', device);
                query.include(['device.game']);
                return query.first();
            }
        }).then(function (deviceRole) {
            if (deviceRole) {
                let device = deviceRole.get('device');
                let role = deviceRole.get('role')
                console.log(`devices: _unbindDeviceToRole:deviceRole:device:${device && device.id} role:${role && role.id}`);
            } else {
                console.log(`devices: _unbindDeviceToRole:deviceRole:${deviceRole}`);
            }

            //如果为空 说明没有绑定
            if (!deviceRole) {
                return Parse.Promise.error("这个大屏幕没有和您绑定。");
            }
            //不为空 说明已经绑定 
            else {
                let device = deviceRole.get('device');
                let game = device.get('game');
                //判断这个device是否绑定了GAME
                if (game) {
                    //先把game解绑
                    return that._unbindDeviceToGame(device, game).then(function (game) {
                        return deviceRole.destroy();
                    });
                } else {
                    return deviceRole.destroy();
                }
            }
        })
    },
    /**
     * 解除绑定到Game的大屏幕
     * @param {*} uuid
     */
    _unbindDeviceToGame(device, game) {
        console.log(`devices:_unbindDeviceToGame:uuid:${device && device.get('uuid')} game:${game && game.id}`);
        device.set('game', null);
        return device.save().then(function (device) {
            console.log(`devices:_unbindDeviceToGame:device:${device && device.get('uuid')}`);
            return game.fetch().then(function (game) {
                let screens = game.get('screens');
                console.log(`devices:_unbindDeviceToGame:screens:${screens && screens.length}`);
                if (screens) {
                    //看看存不存在
                    let index = screens.findIndex(function (value) {
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
            })
        });
    },
    /**
     * 监听curRole下的大屏幕状态
     * 主要是在绑定或解绑时更新界面
     */
    _subscribeDeviceRole: function () {
        if (sDeviceRoles) {
            sDeviceRoles.unsubscribe();
            sDeviceRoles = null;
        }
        let that = this;
        let curUser = Parse.User.current();
        let curRole = curUser ? curUser.get('curRole') : undefined;
        if (curRole) {
            let query = new Parse.Query(DeviceRole);
            query.equalTo('role', curRole);
            query.include(['device.game']);
            sDeviceRoles = query.subscribe();
            sDeviceRoles.on('open', () => {
                console.log(`devices:sDeviceRoles:opened`);
            });
            sDeviceRoles.on('create', (game) => {
                console.log(`devices:sDeviceRoles:create`);
                that._fetchDeviceRoles();
            });
            sDeviceRoles.on('update', (game) => {
                console.log(`devices:sDeviceRoles:update`);
                that._fetchDeviceRoles();
            });
            sDeviceRoles.on('delete', (game) => {
                console.log(`devices:sDeviceRoles:delete`);
                that._fetchDeviceRoles();
            });
            sDeviceRoles.on('close', () => {
                console.log('devices:sDeviceRoles:closed');
            });
        }
    },
})