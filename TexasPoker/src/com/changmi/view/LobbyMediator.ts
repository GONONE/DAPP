module game {

    export class LobbyMediator extends puremvc.Mediator implements puremvc.IMediator {
        public static NAME: string = "LobbyScreenMediator";

        private timer: egret.Timer;
        private fSendHandCard: boolean;
        private wallet: Wallet = Wallet.getInstance();
        private pokerCache: PokerCache = PokerCache.getInstance();
        private fMatching: boolean = false;

        /**刷新界面 */
        public static REFRESH_USERDATA: string = "refresh_userdata";

        public constructor(viewComponent: any) {
            super(LobbyMediator.NAME, viewComponent);

            this.lobbyScreen.btn_start.addEventListener(egret.TouchEvent.TOUCH_TAP, this.ButtonClick, this);
            this.lobbyScreen.btn_match.addEventListener(egret.TouchEvent.TOUCH_TAP, this.ButtonClick, this);
            this.lobbyScreen.btn_game.addEventListener(egret.TouchEvent.TOUCH_TAP, this.ButtonClick, this);
            this.lobbyScreen.btn_friendsGame.addEventListener(egret.TouchEvent.TOUCH_TAP, this.ButtonClick, this);

            this.lobbyScreen.image_icon.addEventListener(egret.TouchEvent.TOUCH_TAP, this.ButtonClick, this);
            this.lobbyScreen.btn_setting.addEventListener(egret.TouchEvent.TOUCH_TAP, this.ButtonClick, this);

            this.lobbyScreen.btn_diamonds_plus.addEventListener(egret.TouchEvent.TOUCH_TAP, this.plusDiamonds, this);
            this.lobbyScreen.btn_gold_plus.addEventListener(egret.TouchEvent.TOUCH_TAP, this.plusGold, this);
            this.lobbyScreen.btn_close.addEventListener(egret.TouchEvent.TOUCH_TAP, this.changeTONormal, this);

            this.lobbyScreen.addEventListener(egret.Event.ADDED_TO_STAGE, this.requestUserData, this);
        }

        public ButtonClick(event: egret.TouchEvent) {
            SoundManager.getIns().playSound("all_buttons_mp3");

            switch (event.currentTarget.name) {
                case this.lobbyScreen.btn_start.name:
                    if (this.fMatching) {
                        TextUtils.showTextTip("正在匹配..");
                    } else {
                        this.fMatching = true;
                        this.pokerMatch();
                    }
                    break;
                case this.lobbyScreen.image_icon.name:
                    this.lobbyScreen.showAddress(); // 点击头像显示玩家地址
                    break;
                case this.lobbyScreen.btn_setting.name:
                    egret.localStorage.clear(); // 清楚localStorage缓存
                    break;
                case this.lobbyScreen.btn_match.name:
                case this.lobbyScreen.btn_game.name:
                case this.lobbyScreen.btn_friendsGame.name:
                    TextUtils.showTextTip("即将开放");
                    break;
            }
        }

        /**
         *  发起匹配交易 
         */
        public pokerMatch(): void {
            if (this.wallet.amount < MIN_WALLET_BALANCE) {
                TextUtils.showTextTip("钱包余额太少, 无法参与游戏");
                this.updateUTXO();
                return;
            }
            let tx = this.createTx(PokerCode.MATCH);
            console.log("============================== 创建匹配交易 ==============================");
            HttpAPI.HttpTX("createTx", JSON.stringify(tx), this.onCreateTxComplete, this);
        }

        /**
         *  创建交易 
         */
        public createTx(pokercode: number): any {
            console.log("============================== createTx ==============================");
            console.log("---------------------- utxo.length: ", this.wallet.utxo.length);
            console.log("---------------------- wallet.amount: ", this.wallet.amount / COIN);

            if (this.wallet.utxo.length == 0) {
                TextUtils.showTextTip("utxo不足,无法创建交易");
                this.updateUTXO();
                return;
            }

            if (this.wallet.amount < DEFAULT_TX_MONEY) {
                TextUtils.showTextTip("钱包余额不够");
                return;
            }

            let utxos: Array<UTXO> = this.wallet.getAmountUtxo(DEFAULT_TX_MONEY * COIN + DEFAULT_TX_FEE);
            let total: number = 0;
            for (let k = 0; k < utxos.length; k++) {
                total += utxos[k].amount;
            }

            console.log("\n============================== vin ==============================");
            console.log("============================== vin ==============================");

            // create vin
            let vin: Array<any> = new Array<any>();
            for (let i = 0; i < utxos.length; i++) {
                let vinItem = {
                    "txid": utxos[i].txid,
                    "vout": utxos[i].vout
                }
                vin.push(vinItem);
                console.log("====txid: " + utxos[i].txid);
                console.log("====vout: " + utxos[i].vout);
                console.log("====amount: " + utxos[i].amount);
            }
            console.log("============================== vin ==============================");
            console.log("============================== vin ==============================\n");

            // create vout
            let dataVout = {
                "value": 0,
                "type": 1,
                "address": ""
            }

            let moneyVout = {
                "value": DEFAULT_TX_MONEY,
                "type": 0,
                "address": this.wallet.address[1]
            }

            let vout: Array<any> = new Array<any>();
            vout.push(dataVout);
            vout.push(moneyVout);

            // 检查是否需要找零
            let change: number = (total - DEFAULT_TX_FEE - DEFAULT_TX_MONEY * COIN) / COIN;
            if (change) {
                let changeVout = {
                    "value": change,
                    "type": 0,
                    "address": this.wallet.address[0]
                }
                vout.push(changeVout);
            }

            this.wallet.amount -= total;

            let matchaddr: string = "";
            let tableid: string = "";
            if (pokercode == PokerCode.MATCH) {
                matchaddr = this.wallet.address[0];
            } else {
                tableid = this.pokerCache.tableid;
            }

            this.createContent(pokercode);
            let tx = {
                "vin": vin,
                "vout": vout,
                "pokercode": pokercode,
                "matchaddr": matchaddr,
                "tableid": tableid,
                "content": this.pokerCache.content
            };
            return tx;
        }

        /**
         * 创建消息内容
         */
        public createContent(pokercode: number) {
            let content: any;
            switch (pokercode) {
                case PokerCode.MATCH:
                    this.pokerCache.myAddress = this.wallet.address[0];
                    UserUtils.getInstance().getOwnUser().uId = this.pokerCache.myAddress;
                    content = {
                        "pokercode": pokercode
                    }
                    break;
                case PokerCode.BALANCE:
                    content = {
                        "pokercode": pokercode,
                        "index": this.pokerCache.index,
                        "balance": Math.floor(this.wallet.amount / COIN / 2)  // 公开余额为钱包总额的1/2
                    }
                    console.log("============================== 公开余额 ==============================");
                    console.log("           balance: ", content.balance);
                    break;
            }
            this.pokerCache.content = content;
        }

        public onCreateTxComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onCreateTxComplete]: ", request.response);
            console.log("[onCreateTxComplete]: pokercode: ", this.pokerCache.curCode);

            let res = JSON.parse(request.response);
            if (res.code) {
                let data = {
                    "txid": res.data.txid,
                    "hex": res.data.hex,
                    "tableid": this.pokerCache.curCode == PokerCode.MATCH ? "" : this.pokerCache.tableid,
                    "content": this.pokerCache.content
                };
                this.pokerCache.matchTxid = res.data.txid;
                HttpAPI.HttpRelay("postTx", JSON.stringify(data), this.onPostTxComplete, this);
            } else {
                console.log("[ERROR][onCreateTxComplete]: code = 0");
                TextUtils.showTextTip("onCreateTxComplete error");
            }
        }


        /**
         * 发送交易回调
         */
        public onPostTxComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onPostTxComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                console.log("============================== postTx successful ==============================");
                if (this.pokerCache.curCode == PokerCode.MATCH) {
                    this.pokerCache.curCode = PokerCode.MATCHING;
                    this.initTimer();
                    this.sendNotification(ApplicationMediator.ENTER_LOADING);
                    this.fMatching = false;
                }
            } else {
                console.log("============================== postTx failed  ==============================");
                TextUtils.showTextTip("交易广播失败");
            }

            this.wallet.showUtxo();
            this.wallet.showRemoveUtxo();
        }

        /**
         * 开启计时器
         */
        public initTimer(): void {
            this.timer = new egret.Timer(2000, 0);
            this.timer.addEventListener(egret.TimerEvent.TIMER, this.timeFun, this);
            this.timer.addEventListener(egret.TimerEvent.TIMER_COMPLETE, this.timerComFunc, this);
            this.timer.start();
        }

        private timeFun() {
            if (this.pokerCache.curCode == PokerCode.MATCHING) {
                this.getTableID();
            } else {
                this.getTableTxs();
            }
        }

        private timerComFunc() {
            console.log("Lobby计时结束");
        }

        /**
         * 检查是否匹配成功
         */
        public getTableID(): void {
            let data = '{"txid": "' + this.pokerCache.matchTxid + '"}';
            HttpAPI.HttpRelay("getTableID", data, this.onGetTableIDComplete, this);
        }
        public onGetTableIDComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onGetTableIDComplete]: ", request.response);

            let res = JSON.parse(request.response);
            if (res.code) {
                this.pokerCache.pokerAddress = res.data.pokeraddress;
                this.pokerCache.tableid = res.data.tableid;

                let addrs = JSON.parse(res.data.address);
                let playersize: number = addrs.length;

                for (let i = 0; i < playersize; i++) {
                    this.pokerCache.addresses.push(addrs[i]);
                }
                this.pokerCache.playersize = playersize;

                let index = this.pokerCache.addresses.indexOf(this.pokerCache.myAddress);
                this.pokerCache.index = index;

                console.log("============================== 匹配成功 ==============================");
                console.log("txid: ", this.pokerCache.matchTxid);
                console.log("tableid: ", this.pokerCache.tableid);
                console.log("playersize: ", this.pokerCache.playersize);
                console.log("index: ", this.pokerCache.index);
                console.log("myAddress: ", this.pokerCache.myAddress);
                console.log("============================== 匹配成功 ==============================");

                this.pokerCache.curCode = PokerCode.BALANCE;
                let tx = this.createTx(PokerCode.BALANCE);
                HttpAPI.HttpTX("createTx", JSON.stringify(tx), this.onCreateTxComplete, this);
            } else {
                console.log("============================== 正在匹配 ==============================");
            }
        }

        /**
         * 获取该局游戏数据
         */
        public getTableTxs(): void {
            let data = '{"tableid": "' + this.pokerCache.tableid + '"}';
            HttpAPI.HttpRelay("getTableTxs", data, this.onGetTableTxsComplete, this);
        }
        public onGetTableTxsComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            // console.log("[onGetTableTxsComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                let txs = JSON.parse(request.response).data.txs;

                // console.log("txs.size: ", txs.length);
                // console.log("pokerCache.size: ", this.pokerCache.size);
                // console.log("pokerCache.curCode: ", this.pokerCache.curCode);

                if (this.pokerCache.curCode == PokerCode.BALANCE && txs.length >= this.pokerCache.playersize) {
                    for (let i = 0; i < this.pokerCache.playersize; i++) {
                        let conte = JSON.parse(txs[i].content);
                        this.pokerCache.balance.add(conte.index, conte.balance);

                        // 初始化下注容器
                        this.pokerCache.hasbet.add(i, 0);
                        this.pokerCache.status.add(i, -1);
                        this.pokerCache.stake.add(conte.index, conte.balance);
                    }
                    this.pokerCache.size = this.pokerCache.playersize;
                    this.pokerCache.curCode = PokerCode.SHUFFLE;
                    console.log("============================== 洗牌 ==============================");
                    this.shuffle();
                }
            } else {
                console.log("[ERROR][onGetTableTxsComplete]: code = 0");
                TextUtils.showTextTip("onGetTableTxsComplete error");
            }
        }

        /** 
         * 洗牌
         */
        public shuffle(): void {
            let data = '{"tableid":"' + this.pokerCache.tableid + '", "playersize":' + this.pokerCache.playersize + '}';
            HttpAPI.HttpTX("shuffle", data, this.onShuffleComplete, this);
        }
        public onShuffleComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onShuffleComplete]: ", request.response);

            console.log("pokercode: ", this.pokerCache.curCode);
            if (JSON.parse(request.response).code) {
                this.pokerCache.curCode = PokerCode.HAND_CARD;
                console.log("============================== 获取手牌 ==============================");
                this.getHandCard();
            } else {
                console.log("[ERROR][onShuffleComplete]: code = 0");
                TextUtils.showTextTip("onShuffleComplete error");
            }
        }

        /**
         * 获取手牌
         */
        public getHandCard(): void {
            let data = '{"tableid":"' + this.pokerCache.tableid + '", "index":' + this.pokerCache.index + '}';
            HttpAPI.HttpTX("getHandCard", data, this.onGetHandCardComplete, this);
        }
        public onGetHandCardComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onGetHandCardComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                let hc = JSON.parse(request.response).data;
                this.pokerCache.handCard.push(hc[0]);
                this.pokerCache.handCard.push(hc[1]);
                this.pokerCache.curCode = PokerCode.BET;
                console.log("============================== 获取手牌成功 ==============================");
                console.log("           handcard: ", hc[0], hc[1]);
                this.enterGame();
            } else {
                console.log("[ERROR][onGetHandCardComplete]: code = 0");
                TextUtils.showTextTip("onGetHandCardComplete error");
            }
        }

        /**
         * 初始化玩家信息, 进入游戏
         */
        public enterGame(): void {
            // user.uid => poker.matchTxID
            // user.name => poker.address
            // user.chairId => poker.index
            // user.seat => UI上显示的位置, 当前玩家为3

            let myIndex: number = this.pokerCache.index;
            let userArray: Array<User> = new Array<User>();
            for (let i: number = 0; i < this.pokerCache.playersize; i++) {
                if (i == myIndex) {
                    let own: User = UserUtils.getInstance().getOwnUser();
                    own.chairId = myIndex;
                    own.uId = this.pokerCache.addresses[i];
                    own.name = this.pokerCache.addresses[i].substr(0, 8);
                    own.money = this.pokerCache.balance.get(i);
                    own.stake = 0;
                    userArray.push(own);
                    continue;
                }
                var user = new User();
                user.chairId = i;
                user.uId = this.pokerCache.addresses[i];
                user.name = this.pokerCache.addresses[i].substr(0, 8);
                user.money = this.pokerCache.balance.get(i);
                user.stake = 0;
                userArray.push(user);
            }

            UserUtils.getInstance().initUsers(userArray);
            CardUtils.getInstance().putPublicCards(new Array<number>());
            CachePool.addObj("jackpot", 0);
            CachePool.addObj("ready", 10086);
            CachePool.addObj("time", 60);

            this.sendNotification(LoadMediator.STOP_ROTATE);
            this.sendNotification(GameCommand.START_GAME);
            this.timer.reset();

            let hc1: number = this.pokerCache.handCard[0];
            let hc2: number = this.pokerCache.handCard[1];

            var data: BaseMsg = new BaseMsg();
            data.command = Commands.PUSH_OWNCARD;
            data.content = { "holeCards": [hc1, hc2] };
            this.sendNotification(GameProxy.POP_CARD, data.content);
            this.timer.reset();
        }

        /**
         * 获取utxo
         */
        public updateUTXO(): void {
            console.log("============================== UPDATE UTXO ==============================");
            let data = '{"address": "' + this.wallet.address[0] + '"}';
            HttpAPI.HttpRelay("getUtxo", data, this.onUpdateUTXOComplete, this);
        }

        public onUpdateUTXOComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            let code = JSON.parse(request.response).code;
            if (code) {
                let blockHeight = JSON.parse(request.response).data.blockheight;

                console.log("           blockHeight: ", blockHeight);
                let localHeight = egret.localStorage.getItem("blockheight");
                console.log("           localHeight: ", egret.localStorage.getItem("blockheight"));
                if (localHeight == null || localHeight < blockHeight) {
                    this.updateUtxo(JSON.parse(request.response).data);
                    egret.localStorage.setItem("blockheight", blockHeight);
                }
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

            this.wallet.initWallet(res);
            UserUtils.getInstance().getOwnUser().pokerWallet = Math.floor(this.wallet.amount / COIN);
            console.log("           wallet.amount: ", UserUtils.getInstance().getOwnUser().pokerWallet);
            this.wallet.saveUtxo();
        }

        public listNotificationInterests(): Array<any> {
            return [
                LobbyMediator.REFRESH_USERDATA
            ];
        }

        public handleNotification(notification: puremvc.INotification): void {
            var data: any = notification.getBody();
            switch (notification.getName()) {
                case LobbyMediator.REFRESH_USERDATA: {
                    console.log("刷新玩家金额");
                    this.lobbyScreen.resetUser();
                    break;
                }
            }
        }
        public plusDiamonds() {
            this.lobbyScreen.skin.currentState = "diamond_buy";
            SoundManager.getIns().playSound("appear_mp3")
            this.lobbyScreen.recharge.play(0);
        }
        public plusGold() {
            this.lobbyScreen.skin.currentState = "coin_conver";
            SoundManager.getIns().playSound("appear_mp3")
            this.lobbyScreen.recharge.play(0);
        }
        public changeTONormal() {
            this.lobbyScreen.skin.currentState = "normal";
            SoundManager.getIns().playSound("disappear_mp3")
        }

        public requestUserData() {
            this.sendNotification(LobbyCommand.REFRESH_DATA);
        }

        public get lobbyScreen(): LobbyScreen {
            return <LobbyScreen><any>(this.viewComponent);
        }

    }
}