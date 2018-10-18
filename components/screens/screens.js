var Parse = require('../../parse');
let Game = Parse.Object.extend("Game");
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        gameId: {
            type: String,
            value: undefined,
            observer: '_gameIdChange'
        }
    },
    /**
     * 组件的初始数据
     */
    data: {
        game: {},
        devices: [],
        showModal: false,
        action: '',//添加或删除
        inputUuid: ''
    },
    // 生命周期函数，可以为函数，或一个在methods段中定义的方法名
    created: function () {
        console.log(`screens:created`);
    },
    attached: function () {
        console.log(`screens:attached`);
    },
    ready: function () {
        console.log(`screens:ready`);
    },
    moved: function () {
        console.log(`screens:moved`);
    },
    detached: function () {
        console.log(`screens:detached`);
    },
    /**
     * 组件的方法列表
     */
    methods: {
        _gameIdChange(newId, oldId) {
            console.log(`screens:_gameChange:newId:${newId} oldId:${oldId}`);
            if (newId) {
                this._fetchGame(newId);
                this._fetchUserDevices();
            }
        },
        /**
         * 绑定大屏幕到当前用户
         * @param {*} uuid 
         */
        _bindDeviceToUser(uuid) {
            console.log(`game: bindDeviceToUser:uuid:${uuid}`);
            let that = this;
            let _device;
            let query = new Parse.Query('Device');
            query.equalTo('uuid', uuid);
            //判断这个大屏幕是不是存在
            query.first().then(function (device) {
                console.log(`game: bindDeviceToUser:device:${device}`);
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
                console.log(`game: bindDeviceToUser:game:${JSON.stringify(deviceUser)}`);
                //重新获取device进行更新
                that._fetchUserDevices();
            }, function (error) {
                console.log(`game: bindDeviceToUser:error:${error}`);
            })
        },
        /**
         * 解除当前用户指定大屏幕的绑定
         * @param {*} uuid 
         */
        _unbindDeviceToUser(uuid) {
            let that = this;
            let _device;
            let query = new Parse.Query('Device');
            query.equalTo('uuid', uuid);
            //判断这个大屏幕是不是存在
            query.first().then(function (device) {
                console.log(`screens:unbindDeviceToUser:device:${device}`);
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
                        return Parse.Promise.error("这个大屏幕绑定了Game，无法解绑。");
                    } else {
                        return deviceUser.destroy();
                    }
                }
            }).then(function (deviceUser) {
                console.log(`screens:unbindDeviceToUser:game:${JSON.stringify(deviceUser)}`);
                //重新获取device进行更新
                that._fetchUserDevices();
            }, function (error) {
                console.log(`screens:unbindDeviceToUser:error:${error}`);
            })
        },

        /**
         * 绑定大屏幕到Game
         * @param {*} game
         * @param {*} device
         */
        _bindDeviceToGame(device, game) {
            let that = this;
            //一个大屏幕只能被一个game使用。已经被其它的game使用了 先删除
            let oldGame = device.get('game');
            if (oldGame) {
                console.log(`screens:_bindDeviceToGame:oldGame:${JSON.stringify(oldGame)}`);
                let screens = oldGame.get('screens');
                if (screens && screens.length > 0) {
                    //看看存不存在
                    let index = screens.findIndex(function (value, index, arr) {
                        return value.id === device.id;
                    });
                    console.log(`screens:_bindDeviceToGame:oldGame:index:${index}`);
                    //如果存在 删除后保存
                    if (index != -1) {
                        screens.splice(index, 1);
                        oldGame.set('screens', screens);
                        //判断还有没有screens 如果已经没有了 删除screen（角色)读取此game的权限
                        if (!screens || screens.length === 0) {
                            let gameAcl = oldGame.get('ACL');
                            gameAcl.setRoleReadAccess('screen', false);
                            gameAcl.setRoleWriteAccess('screen', false);
                        }
                        oldGame.save();
                    }
                }
            }

            //要先把device绑定到game中screens 并授权给screen角色可以访问此game。不然device一旦save
            //大屏幕上会触发添加此game的liveQuery 没有授权就会出错

            //设置game的ACL,让screen（角色）能访问这个game
            let gameAcl = game.get('ACL');
            gameAcl.setRoleReadAccess('screen', true);
            gameAcl.setRoleWriteAccess('screen', true);
            //处理Screens
            let screens = game.get('screens');
            if (!screens) {
                screens = [];
                screens.push(device);
            } else {
                //看看存不存在
                let index = screens.findIndex(function (value, index, arr) {
                    return value.id === device.id;
                });
                //存在替换 不存在push
                if (index !== -1)
                    screens.splice(index, 1, device);
                else
                    screens.push(device);
            }
            // console.log(`screens:_bindDeviceToGame:screens:${JSON.stringify(screens)}`);
            game.set('screens', screens);
            game.save().then(function (game) {
                device.set('game', game);
                return device.save();
            }).then(function (device) {
                console.log(`screens:_bindDeviceToGame:device1:${device}`);
                //重新获取device进行更新
                that._fetchUserDevices();
            }, function (error) {
                console.log(`screens:_bindDeviceToGame:error:${error}`);
            })
        },
        /**
         * 解除绑定到Game的大屏幕
         * @param {*} uuid
         */
        _unbindDeviceToGame(device, game) {
            let that = this;
            console.log(`screens:_unbindDeviceToGame:uuid:${device.get('uuid')} game:${game.objectId}`);
            device.set('game', null);
            device.save().then(function (device) {
                console.log(`screens:_unbindDeviceToGame:device2:${JSON.stringify(device)}`);
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
                // console.log(`screens:_unbindDeviceToGame:game:${JSON.stringify(game)}`);
                // that.setData({ game: game }, function () {
                //     console.log(`screens:_unbindDeviceToGame:setDataFinished:game`);
                // });
                //重新获取device进行更新
                that._fetchUserDevices();
            }, function (error) {
                console.log(`screens:_unbindDeviceToGame:error:${error}`);
            })
        },

        /**
        * 查询和当前用户绑定的Devices
        */
        _fetchUserDevices() {
            let that = this;
            let DeviceUser = Parse.Object.extend("DeviceUser");
            let query = new Parse.Query(DeviceUser);
            query.equalTo('user', Parse.User.current());
            query.include('device');
            query.find().then(function (deviceUsers) {
                // console.log(`screens: fetchUserDevices:deviceUsers:${JSON.stringify(deviceUsers)}`);
                let devices = [];
                if (deviceUsers) {
                    for (let du of deviceUsers) {
                        devices.push(du.get('device'));
                    }
                }
                that.setData({ devices }, function () {
                    // console.log(`screens:setDataFinished:devices:${JSON.stringify(this.data.devices)}`);
                    console.log(`screens:_fetchUserDevices:setDataFinished`);
                });

            }, function (error) {
                console.error(`screens:error:${JSON.stringify(error)}`)
            });
        },
        /**
         * 根据ID获取game详情
         */
        _fetchGame: function (id) {
            console.log(`screens:_fetchGame:id:${id}`);
            let that = this;
            let query = new Parse.Query(Game);
            query.include('screens');
            query.get(id).then(function (game) {
                console.log(`screens:_fetchGame:${game.id}`);
                that.setData({ game: game }, function () {
                    console.log(`screens:_fetchGame:setDataFinished:game`);
                });
            }, function (error) {
                console.error(error);
            })
        },
        /**
         * 弹窗
         */
        actionTap: function (e) {
            // console.log(`screens:actionTap.${JSON.stringify(e)}`);
            let action = e.currentTarget.dataset.action;
            this.setData({
                showModal: true,
                action
            })
        },
        /**
         * 解除绑定到Game的大屏幕
         */
        unbindToGameTap: function (e) {
            let uuid = e.currentTarget.dataset.uuid;
            let game = this.data.game;
            let devices = this.data.devices;
            console.log(`screens:unbindToGameTap:uuid:${uuid} game:${game.id} devices:${JSON.stringify(devices.length)}`);

            let device = devices.find(function (value, index, arr) {
                return value.get('uuid') === uuid;
            });
            if (device && game) {
                this._unbindDeviceToGame(device, game);
            }
        },
        /**
         * 解除绑定到Game的大屏幕
         */
        bindToGameTap: function (e) {
            let uuid = e.currentTarget.dataset.uuid;
            let game = this.data.game;
            let devices = this.data.devices;
            console.log(`screens:bindToGameTap:uuid:${uuid} game:${game.id} devices:${JSON.stringify(devices.length)}`);
            let device = devices.find(function (value, index, arr) {
                return value.get('uuid') === uuid;
            });
            if (device && game) {
                this._bindDeviceToGame(device, game);
            }
        },
        /**
         * 弹出框蒙层截断touchmove事件
         */
        preventTouchMove: function () {
        },
        /**
         * 隐藏模态对话框
         */
        hideModal: function () {
            this.setData({
                showModal: false
            });
        },
        /**
         * 对话框取消按钮点击事件
         */
        onCancel: function () {
            this.hideModal();
        },
        /**
         * 对话框确认按钮点击事件
         */
        onUuidInputChange: function (e) {
            let inputUuid = e.detail.value;
            this.setData({
                inputUuid
            });
            console.log(`screens:onUuidInputChange.uuid：${inputUuid}`);
        },
        /**
         * 对话框确认按钮点击事件
         */
        onModalAddTap: function (e) {
            this.hideModal();
            let uuid = this.data.inputUuid;
            console.log(`screens:onModalAddTap.uuid:${uuid}`);
            if (uuid && uuid.length === 4) {
                this._bindDeviceToUser(uuid);
            }
        },
        /**
         * 对话框确认按钮点击事件
         */
        onModalDeleteTap: function (e) {
            this.hideModal();
            let uuid = this.data.inputUuid;
            console.log(`screens:onModalDeleteTap.uuid:${uuid}`);
            if (uuid && uuid.length === 4) {
                this._unbindDeviceToUser(uuid);
            }
        }
    }
})
