module game {

    export class LoadAndLoginMediator extends puremvc.Mediator implements puremvc.IMediator {
        public static NAME: string = "LoadAndLoginMediator";

        /**游客登录 */
        public static TOURIST_LOGIN: string = "tourist_login";

        private loginModel: Login = new Login();

        private wallet: Wallet = Wallet.getInstance();

        public constructor(viewComponent: any) {
            super(LoadAndLoginMediator.NAME, viewComponent);

            RES.addEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
            RES.addEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
            RES.addEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
            RES.addEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
            this.LoadAndLoginScreen.currentX = this.LoadAndLoginScreen.lable_progress.x;
            this.LoadAndLoginScreen.load_progress.maximum = 100;//设置进度条的最大值
            this.LoadAndLoginScreen.load_progress.minimum = 0;//设置进度条的最小值
            RES.loadGroup("preload");

            this.LoadAndLoginScreen.btn_accountLogin.addEventListener(egret.TouchEvent.TOUCH_TAP, this.accountLogin, this);
            this.LoadAndLoginScreen.btn_close.addEventListener(egret.TouchEvent.TOUCH_TAP, this.close, this);
            this.LoadAndLoginScreen.btn_register.addEventListener(egret.TouchEvent.TOUCH_TAP, this.register, this);
            this.LoadAndLoginScreen.btn_next.addEventListener(egret.TouchEvent.TOUCH_TAP, this.next, this);
            this.LoadAndLoginScreen.btn_complete.addEventListener(egret.TouchEvent.TOUCH_TAP, this.complete, this);
            this.LoadAndLoginScreen.btn_forget.addEventListener(egret.TouchEvent.TOUCH_TAP, this.forget, this);
            this.LoadAndLoginScreen.btn_login.addEventListener(egret.TouchEvent.TOUCH_TAP, this.login, this);
            this.LoadAndLoginScreen.btn_touristLogin.addEventListener(egret.TouchEvent.TOUCH_TAP, this.touristLogin, this);
        }

        public listNotificationInterests(): Array<any> {
            return [
                LoadAndLoginMediator.TOURIST_LOGIN
            ];
        }

        public handleNotification(notification: puremvc.INotification): void {
            var data: any = notification.getBody();
            switch (notification.getName()) {
                case LoadAndLoginMediator.TOURIST_LOGIN: {
                    this.LoadAndLoginScreen.dismissProgress();
                    this.sendNotification(LoginCommand.ENTER_LOBBY);
                    break;
                }
            }
        }

        public login(event: egret.TouchEvent) {
            SoundManager.getIns().playSound("all_buttons_mp3");
            let account = this.LoadAndLoginScreen.et_phone.text;
            // let password = this.LoadAndLoginScreen.et_password.text;
            if (account == "") {
                game.TextUtils.showTextTip("手机号不能为空！！！");
                return;
            }
            // this.loginModel.account = account;
            // this.loginModel.password = password;
            // this.sendNotification(LoginCommand.LOGIN, this.loginModel);

            // 第一次登录
            egret.localStorage.setItem("uid", account);
            let user: User = new User();
            user.name = account;
            UserUtils.getInstance().saveOwnUser(user);
            this.wallet.uid = account;
            this.getMyAddress();
            console.log("============================== 第一次登录 ==============================");
            console.log("           uid: ", this.wallet.uid);
        }

        public touristLogin(event: egret.TouchEvent) {
            // SoundManager.getIns().playSound("all_buttons_mp3");
            // this.LoadAndLoginScreen.showProgress();
            // //发送登录
            // this.sendNotification(LoginCommand.TOURIST_LOGIN);

            // this.accountLogin(event);
            TextUtils.showTextTip("暂不支持游客登录, 请使用账号登录");
        }

        public accountLogin(event: egret.TouchEvent) {
            // 如果以前登录过, 则自动登录
            let localUid = egret.localStorage.getItem("uid");
            if (localUid != null) {
                let user: User = new User();
                user.name = localUid;
                UserUtils.getInstance().saveOwnUser(user);
                this.wallet.uid = localUid;
                this.getMyAddress();
                console.log("============================== 自动登录 ==============================");
                console.log("           uid: ", this.wallet.uid);
            } else {
                this.LoadAndLoginScreen.skin.currentState = "login";
            }

            // let user: User = new User();
            // UserUtils.getInstance().saveOwnUser(user);
            // this.wallet.uid = "13732215910";
            // this.getMyAddress();
        }

        /**
         * 获取已经拥有的地址
         */
        public getMyAddress(): void {
            let data = '{"uid": \"' + this.wallet.uid + '\"}';
            HttpAPI.HttpTX("getMyAddress", data, this.onGetMyAddressComplete, this);
        }
        public onGetMyAddressComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onGetMyAddressComplete]: ", request.response);

            let code = JSON.parse(request.response).code;
            if (code) {
                let addr = JSON.parse(request.response).data.address;

                if (addr.length > 1) {
                    this.wallet.address = addr;
                    this.getUTXO();
                } else if (addr.length == 1) {
                    this.wallet.address = addr;
                    this.getChangeAddress();
                } else {
                    this.getNewAddress();
                }
            } else {
                console.log("[ERROR][onGetChangeAddressComplete]: code = 0");
                TextUtils.showTextTip("onGetChangeAddressComplete error");
            }
        }

        /**
         * 获取新地址
         */
        public getNewAddress(): void {
            let data = '{"uid": "' + this.wallet.uid + '"}';
            HttpAPI.HttpTX("getNewAddress", data, this.onGetNewAddressComplete, this);
        }
        public onGetNewAddressComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onGetNewAddressComplete]: ", request.response);

            let code = JSON.parse(request.response).code;
            if (code) {
                let address = JSON.parse(request.response).data.address;
                this.wallet.address.push(address);
                this.getChangeAddress();
            } else {
                console.log("[ERROR][onGetChangeAddressComplete]: code = 0");
                TextUtils.showTextTip("onGetChangeAddressComplete error");
            }
        }

        /**
         * 获取找零地址
         */
        public getChangeAddress(): void {
            let data = '{"uid": "' + this.wallet.uid + '"}';
            HttpAPI.HttpTX("getNewAddress", data, this.onGetChangeAddressComplete, this);
        }
        public onGetChangeAddressComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onGetChangeAddressComplete]: ", request.response);

            let code = JSON.parse(request.response).code;
            if (code) {
                let address = JSON.parse(request.response).data.address;
                this.wallet.address.push(address);
                this.getUTXO();
            } else {
                console.log("[ERROR][onGetChangeAddressComplete]: code = 0");
                TextUtils.showTextTip("onGetChangeAddressComplete error");
            }
        }


        /**
        * 获取utxo
        * 初始化钱包
        */
        public getUTXO(): void {
            let data = '{"address": "' + this.wallet.address[0] + '"}';
            HttpAPI.HttpRelay("getUtxo", data, this.onGetUTXOComplete, this);
        }

        public onGetUTXOComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;

            let code = JSON.parse(request.response).code;
            console.log("[onGetUTXOComplete]: ", request.response);

            if (code) {
                let blockHeight = JSON.parse(request.response).data.blockheight;

                console.log("============================== GET UTXO ==============================");
                console.log("           blockHeight: ", blockHeight);
                let localHeight = egret.localStorage.getItem("blockheight");
                console.log("           localHeight: ", egret.localStorage.getItem("blockheight"));
                if (localHeight == null || localHeight < blockHeight) {
                    console.log("============================== UPDATE UTXO ==============================");
                    this.updateUtxo(JSON.parse(request.response).data);
                    egret.localStorage.setItem("blockheight", blockHeight);
                } else {
                    console.log("============================== LOCAL UTXO ==============================");
                    this.useLocalUtxo();
                }
            } else {
                console.log("[ERROR][onGetUTXOComplete]: code = 0");
                TextUtils.showTextTip("onGetUTXOComplete error");
            }
        }

        /**
         * 重新获取utxo
         */
        public updateUtxo(data: any) {
            let res = data.utxo;
            console.log("           utxo.length: ", res.length);
            for (let k = 0; k < res.length; k++) {
                console.log("txid: " + res[k].txid + " -- " + " amount: " + res[k].amount);
            }
            this.wallet.showRemoveUtxo();

            if (res.length == 0) {
                console.log("[onGetUTXOComplete]: You wallet is empty");
                TextUtils.showTextTip("你的钱包里还没有钱, 快去充值吧");
            } else {
                this.wallet.initWallet(res);
                UserUtils.getInstance().getOwnUser().pokerWallet = Math.floor(this.wallet.amount / COIN);
            }
            console.log("           wallet.amount: ", UserUtils.getInstance().getOwnUser().pokerWallet);

            this.wallet.saveUtxo();
            this.sendNotification(ApplicationMediator.ENTER_LOBBY);
        }

        /**
        * 使用本地缓存utxo
        */
        public useLocalUtxo() {
            let localutxo = egret.localStorage.getItem("utxo");
            if (localutxo != null) {
                let res = JSON.parse(localutxo);
                console.log("           utxo.length: ", res.length);
                for (let k = 0; k < res.length; k++) {
                    console.log("txid: " + res[k].txid + " -- " + " amount: " + res[k].amount);
                }
                this.wallet.showRemoveUtxo();

                if (res.length == 0) {
                    console.log("[onGetUTXOComplete]: You wallet is empty");
                    TextUtils.showTextTip("你的钱包里还没有钱, 快去充值吧");
                } else {
                    this.wallet.localWallet(res);
                    UserUtils.getInstance().getOwnUser().pokerWallet = Math.floor(this.wallet.amount / COIN);
                    console.log("           wallet.amount: ", UserUtils.getInstance().getOwnUser().pokerWallet);
                }
            }
            this.sendNotification(ApplicationMediator.ENTER_LOBBY);
        }

        public testBitcoin(): void {
            // func();

            // var Web3 = require('web3');
            // var web3 = new Web3();
            // console.log(web3);
            // var balance = new web3.BigNumber('123453421532415134513512354134414');
            // console.log(balance);

            // var keyPair = bitcoin.ECPair.makeRandom()
            // var privkey = keyPair.toWIF()
            // console.log("privkey: " + privkey);
        }

        public close(event: egret.TouchEvent) {
            this.LoadAndLoginScreen.skin.currentState = "closeGroup";
        }
        public register(event: egret.TouchEvent) {
            this.LoadAndLoginScreen.skin.currentState = "register";
        }
        public next(event: egret.TouchEvent) {
            if (this.LoadAndLoginScreen.skin.currentState == "register") {
                this.LoadAndLoginScreen.skin.currentState = "smscheck";
            } else if (this.LoadAndLoginScreen.skin.currentState == "resetPassword") {
                this.LoadAndLoginScreen.skin.currentState = "sms_reset";
            }
        }
        public complete(event: egret.TouchEvent) {
            this.LoadAndLoginScreen.skin.currentState = "login";
            this.LoadAndLoginScreen.et_sms.text = "";
        }
        public forget(event: egret.TouchEvent) {
            this.LoadAndLoginScreen.skin.currentState = "resetPassword";
        }

        private onResourceLoadComplete(event: RES.ResourceEvent): void {
            if (event.groupName == "preload") {
                RES.loadGroup("sound");
            }
            if (event.groupName == "sound") {
                RES.removeEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
                RES.removeEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
                RES.removeEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
                RES.removeEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
                this.LoadAndLoginScreen.showEnterButton();
            }
        }
        /**
        * 资源组加载出错
        * Resource group loading failed
        */
        private onResourceLoadError(event: RES.ResourceEvent): void {
            //TODO
            console.warn("Group:" + event.groupName + " has failed to load");
            //忽略加载失败的项目
            //ignore loading failed projects
            this.onResourceLoadComplete(event);
        }
        /**
       * preload资源组加载进度
       * loading process of preload resource
       */
        private onResourceProgress(event: RES.ResourceEvent): void {
            if (event.groupName == "preload") {
                this.LoadAndLoginScreen.setProgress(event.itemsLoaded, event.itemsTotal);
            }
        }
        /**
       * 资源组加载出错
       *  The resource group loading failed
       */
        private onItemLoadError(event: RES.ResourceEvent): void {
            console.warn("Url:" + event.resItem.url + " has failed to load");
        }
        public get LoadAndLoginScreen(): LoadAndLoginScreen {
            return <LoadAndLoginScreen><any>(this.viewComponent);
        }

    }
}