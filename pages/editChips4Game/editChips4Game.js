// pages/editChips4Game/editChips4Game.js
Page({

    /**
     * 页面的初始数据
     */
    data: {
        chipss: [],
        chips: {},
        action: '',
        submitting: false//正在提交
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        let action = options.action;

        //设置导航标题
        let title = '添加筹码方案';
        if (action === 'edit')
            title = '编辑筹码方案';
        wx.setNavigationBarTitle({
            title
        })

        let name = options.name;//option.name是字符串 转换为整形
        let chipss = JSON.parse(options.chipss);
        console.log(`editChips4Game:onLoad:name:${name} chipss:${chipss.length}`);
        if (name) {
            let chips = chipss.find(function (value) {
                return value.name === name;
            });
            if (chips) {
                this.setData({ action, chips, chipss });
            }
        } else {
            this.setData({ action, chipss });
        }
    },
    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },
    /**
     * 提交表单
     */
    formSubmit: function (e) {
        this.setData({ submitting: true });
        console.log('editChips4Game:formSubmit:chips:', e.detail.value)
        let value = e.detail.value;
        let oldChips = this.data.chips;
        let chipss = this.data.chipss;
        let action = this.data.action;

        //判断有没有重名
        let name = value.name;
        let duplicate = false;
        if ('edit' === action) {
            for (let i = 0; i < chipss.length; i++) {
                const element = chipss[i];
                //不判断自己
                if (oldChips && element.name === oldChips.name) {
                    continue;
                }
                if (name === element.name) {
                    duplicate = true;
                    break;
                }
            }
        } else if ('add' === action) {
            for (let i = 0; i < chipss.length; i++) {
                const element = chipss[i];
                if (name === element.name) {
                    duplicate = true;
                    break;
                }
            };
        }

        if (duplicate) {
            wx.showToast({
                title: '重名,请重新输入名称',
                icon: 'none',
                duration: 2000
            });
            this.setData({ submitting: false });
            return;
        }

        //获取表单数据
        let newChips = { name: value.name, value: parseInt(value.value) };
        //如果是编辑 直接把目标级别替换掉可以。
        if ('edit' === action) {
            //根据name获取到对应的chips
            let index = chipss.findIndex(function (value) {
                return value.name === oldChips.name;
            });
            if (index != -1) {
                //替换
                chipss.splice(index, 1, newChips);
            }
        } else if (action === 'add') {
            chipss.push(newChips);//插入
        }

        console.log(`editRchipsPattern:formSubmit:chipss:${JSON.stringify(chipss)}`);

        //不管新建还是编辑 重新设置前一页toggles,长度为chipss的长度 全部为false
        let toggles = [];
        chipss.forEach(element => {
            toggles.push(false);
        });

        //往父page传递chipss
        var pages = getCurrentPages();
        var currPage = pages[pages.length - 1];   //当前页面
        var prevPage = pages[pages.length - 2];  //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
            chipss,
            toggles
        }, function () {
            console.log(`editRchipsPattern:formSubmit:setDataFinished`);
        });
        wx.navigateBack({
            delta: 1
        });
    },
})