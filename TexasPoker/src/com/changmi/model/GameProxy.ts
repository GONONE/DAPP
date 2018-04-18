module game {

    export class GameProxy extends puremvc.Proxy implements puremvc.IProxy {
        public static NAME: string = "GameProxy";
        /**
         * 改变底部按钮组
         */
        public static CHANGE_STATE: string = "change_state";
        /**
        * 加入玩家
        */
        public static ADD_USER: string = "add_user";

        /**
        * 去除玩家
        */
        public static REM_USER: string = "rem_user";

        /**
         * 下注操作
         */
        public static ADD_CHIP: string = "add_chip";
        /**
         * 跟注操作
         */
        public static CALL: string = "call";
        /**
         * 让牌
         */
        public static CHECK: string = "check";
        /**
         * 弃牌
         */
        public static FOLD: string = "fold";
        /**
         * 全下
         */
        public static AllIN: string = "all-in";
        /**
         * 发公共牌
         */
        public static POP_PUBLICCARD: string = "pop_publiccard";
        /**
         * 发牌
         */
        public static POP_CARD: string = "pop_card";
        /**
        * 公开手牌
        */
        public static OPEN_HAND: string = "open_hand";
        /**
         * 结束
         */
        public static RESULT: string = "result";
        /**
         * 重置桌上信息
         */
        public static GAME_RESET: string = "game_reset";

        private _nextStep: number;

        private pokerCache: PokerCache = PokerCache.getInstance();
        private wallet: Wallet = Wallet.getInstance();

        public constructor() {
            super(GameProxy.NAME);
            NetController.getInstance().addListener(Commands.PLAYERBET, this);
            NetController.getInstance().addListener(Commands.PUSH_PUBLICCARD, this);
            NetController.getInstance().addListener(Commands.PUSH_OWNCARD, this);
            NetController.getInstance().addListener(Commands.ADD_PLAYER, this);
            NetController.getInstance().addListener(Commands.REM_PLAYER, this);
            NetController.getInstance().addListener(Commands.RESULT, this);
        }

        /**
         * 根据传过来的信息判断操作，是让，弃牌，下注等操作，然后sendData
         */
        public playAction(data: any) {
            if (this.pokerCache.fgameover)
                return;

            this.buildBetContent(data);
            let tx = this.createBetTx();
            HttpAPI.HttpTX("createTx", JSON.stringify(tx), this.onCreateBetTxComplete, this);
        }

        public onCreateBetTxComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onCreateBetTxComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                this.postTx(JSON.parse(request.response).data);
            } else {
                TextUtils.showTextTip("创建下注交易失败");
            }
            this.updateUTXO();
        }

        /**
         * 广播交易
         */
        public postTx(res: any): void {
            let data = {
                "txid": res.txid,
                "hex": res.hex,
                "tableid": this.pokerCache.tableid,
                "content": this.pokerCache.content
            };
            HttpAPI.HttpRelay("postTx", JSON.stringify(data), this.onPostTxComplete, this);
        }
        public onPostTxComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onPostTxComplete]: ", request.response);
            if (JSON.parse(request.response).code) {
                console.log("============================== postTx successful ==============================");
            } else {
                console.log("============================== postTx failed  ==============================");
                TextUtils.showTextTip("交易广播失败");
            }
        }

        public buildBetContent(data: any): void {
            console.log("============================== Build Content ==============================");
            console.log("           data.raiseStack: ", data.raiseStack);
            console.log("           data.action: ", data.action);

            let curbet: number = 0;
            let status: number = 0;  // -1:还未行动 0:下注 1:全下 2:弃牌

            switch (data.action) {
                case Actions.bet:   // 下注
                case Actions.call:  // 跟注
                    curbet = data.raiseStack;
                    if (curbet == UserUtils.getInstance().getOwnUser().money) {
                        status = 2;
                    } else {
                        status = 0;
                    }
                    break;
                case Actions.pass:  // 让牌
                    curbet = 0;
                    status = 0;
                    break;
                case Actions.allin: // 全下
                    curbet = UserUtils.getInstance().getOwnUser().money;
                    status = 2;
                    break;
                case Actions.giveup: //弃牌
                    curbet = 0;
                    status = 1;
                    break;
            }

            this.pokerCache.curbet = curbet;

            this.pokerCache.jackpot += curbet;
            this.pokerCache.status.update(this.pokerCache.index, status);

            let hasbet = this.pokerCache.hasbet.get(this.pokerCache.index) + curbet;
            this.pokerCache.hasbet.update(this.pokerCache.index, hasbet);
            if (hasbet > this.pokerCache.maxbet) {
                this.pokerCache.maxbet = hasbet;
            }

            let stake = this.pokerCache.stake.get(this.pokerCache.index) - curbet;
            this.pokerCache.stake.update(this.pokerCache.index, stake);

            this.isGameOver();

            let chasbet: Array<any> = new Array<any>();
            let cstake: Array<any> = new Array<any>();
            let cstatus: Array<any> = new Array<any>();
            for (let k = 0; k < this.pokerCache.playersize; k++) {
                let hb = {
                    "index": k,
                    "hasbet": this.pokerCache.hasbet.get(k)
                }
                let sk = {
                    "index": k,
                    "stake": this.pokerCache.stake.get(k)
                }
                let st = {
                    "index": k,
                    "status": this.pokerCache.status.get(k)
                }
                chasbet.push(hb);
                cstake.push(sk);
                cstatus.push(st);
            }
            let content = {
                "pokercode": PokerCode.BET,
                "curindex": this.pokerCache.index,
                "nextindex": this.pokerCache.nextindex,
                "curbet": this.pokerCache.curbet,
                "maxbet": this.pokerCache.maxbet,
                "jackpot": this.pokerCache.jackpot,
                "fgameover": this.pokerCache.fgameover,
                "fpubcard": this.pokerCache.fpubcard,
                "fdiscard": this.pokerCache.fdiscard,
                "round": this.pokerCache.round,
                "mhasbet": chasbet,
                "mstake": cstake,
                "mstatus": cstatus,
                "pubcard": this.pokerCache.pubcard,
                "openhand": this.pokerCache.openhand
            }
            this.pokerCache.content = content;
        }

        /**
         * 计算游戏是否结束
         */
        public isGameOver(): void {
            let waitnum: number = 0;
            let betnum: number = 0;
            let allnum: number = 0;
            let disnum: number = 0;
            for (let i = 0; i < this.pokerCache.playersize; i++) {
                let status = this.pokerCache.status.get(i);
                switch (status) {
                    case -1:
                        waitnum++;
                        break;
                    case 0:
                        betnum++;
                        break;
                    case 1:
                        disnum++;
                        break;
                    case 2:
                        allnum++;
                        break;
                }
            }

            console.log("============ waitnum: ", waitnum);
            console.log("============ betnum: ", betnum);
            console.log("============ disnum: ", disnum);
            console.log("============ allnum: ", allnum);

            if (waitnum > 0) {
                this.pokerCache.fgameover = false;
                if (disnum == this.pokerCache.playersize - 1) {
                    this.pokerCache.fgameover = true;    // 除了一个人,其他人都弃牌,不用发剩余公共牌
                    this.pokerCache.fpubcard = false;
                    this.pokerCache.fdiscard = true;
                }
            } else if (allnum + disnum == this.pokerCache.playersize) {
                this.pokerCache.fgameover = true;    // 所有人都全下或弃牌,发剩余公共牌
                if (this.pokerCache.round < 3) {
                    this.pokerCache.round = 4;
                    this.pokerCache.fpubcard = true;
                } else {
                    this.pokerCache.fpubcard = false;
                }
            } else if (allnum + disnum == this.pokerCache.playersize - 1 && betnum == 1 && allnum > 0) {
                let flag: boolean = false;
                for (let j = 0; j < this.pokerCache.playersize; j++) {
                    if (this.pokerCache.status.get(j) == 0 && this.pokerCache.hasbet.get(j) < this.pokerCache.maxbet) {
                        flag = true;
                        break;
                    }
                }

                if (!flag) {
                    this.pokerCache.fgameover = true;    // 除了一个人,其他人都全下或弃牌,发剩余公共牌
                    if (this.pokerCache.round < 3) {
                        this.pokerCache.round = 4;
                        this.pokerCache.fpubcard = true;
                    } else {
                        this.pokerCache.fpubcard = false;
                    }
                }
            } else if (disnum == this.pokerCache.playersize - 1) {
                this.pokerCache.fgameover = true;    // 除了一个人,其他人都弃牌,不用发剩余公共牌
                this.pokerCache.fpubcard = false;
                this.pokerCache.fdiscard = true;
            }

            // 计算下一个下注的玩家
            if (!this.pokerCache.fgameover) {
                let nextindex: number = this.pokerCache.index + 1;
                while (true) {
                    if (nextindex == this.pokerCache.playersize) {
                        nextindex = 0;
                    }
                    if (this.pokerCache.status.get(nextindex) < 1) {
                        this.pokerCache.nextindex = nextindex;
                        break;
                    }
                    nextindex++;
                }
            }

            // 是否要发公共牌
            if (!this.pokerCache.fgameover) {
                if (waitnum > 0) {
                    this.pokerCache.fpubcard = false;
                    return;
                }

                if (this.pokerCache.nextindex < this.pokerCache.index) {
                    for (let j = 0; j < this.pokerCache.playersize; j++) {
                        let status = this.pokerCache.status.get(j);
                        if (status == 0 && this.pokerCache.hasbet.get(j) == this.pokerCache.maxbet) {
                            continue;
                        }
                        if (status == 1) {
                            continue;
                        }
                        if (status == 2 && this.pokerCache.hasbet.get(j) <= this.pokerCache.maxbet) {
                            continue;
                        }
                        this.pokerCache.fpubcard = false;
                        return;
                    }
                    this.pokerCache.fpubcard = true;
                    this.pokerCache.round++;

                    if (this.pokerCache.round > 3) {
                        this.pokerCache.fgameover = true;
                        this.pokerCache.fpubcard = false;
                        console.log("================================ GAME OVER, OPEN HAND ============================");
                    }
                }
            }
        }

        /**
         *  创建交易 
         */
        public createBetTx(): any {
            console.log("---------------------- utxo.length: ", this.wallet.utxo.length);
            console.log("---------------------- wallet.amount: ", this.wallet.amount / COIN);

            let bet: number = this.pokerCache.curbet;
            if (bet == 0) {
                bet = DEFAULT_TX_MONEY;
            }

            let utxos: Array<UTXO> = this.wallet.getAmountUtxo(bet * COIN + DEFAULT_TX_FEE);
            let total: number = 0;
            for (let k = 0; k < utxos.length; k++) {
                total += utxos[k].amount;
            }
            console.log("---------------------- total: ", total);

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
            let betVout = {
                "value": bet,
                "type": 2,
                "address": this.pokerCache.pokerAddress
            }

            let dataVout = {
                "value": 0,
                "type": 1,
                "address": ""
            }

            let vout: Array<any> = new Array<any>();
            vout.push(betVout);
            vout.push(dataVout);

            // 检查是否需要找零
            let change: number = (total - DEFAULT_TX_FEE - bet * COIN) / COIN;
            if (change) {
                let changeVout = {
                    "value": change,
                    "type": 0,
                    "address": this.pokerCache.myAddress
                }
                vout.push(changeVout);
            }

            let tx = {
                "vin": vin,
                "vout": vout,
                "pokercode": PokerCode.BET,
                "matchaddr": "",
                "tableid": this.pokerCache.tableid,
                "content": this.pokerCache.content
            };

            this.wallet.amount -= total;
            return tx;
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

        public sendReady() {
            var data: BaseMsg = new BaseMsg();
            data.command = Commands.INIT_PLAYER;
            data.content = { "uId": UserUtils.getInstance().getOwnUser().uId, "tId": UserUtils.getInstance().getOwnUser().tId, "code": "0" };
            NetController.getInstance().sendData(NetController.GAMESOCKET, data);
        }

        /**收到服务器消息*/
        private onReciveMsg(data: BaseMsg) {
            let command = data.command;
            console.warn('onReciveMsg', command);
            switch (command) {
                //加入玩家，更新界面
                case Commands.ADD_PLAYER:
                    this.sendNotification(GameProxy.ADD_USER, UserUtils.getInstance().pushUser(data.content["user"]));
                    break;
                //玩家退出，更新界面
                case Commands.REM_PLAYER:
                    this.sendNotification(GameProxy.CHECK, data.content);
                    this.sendNotification(GameProxy.REM_USER, UserUtils.getInstance().popUser(data.content["uid"]));
                    break;
                //玩家各种操作
                case Commands.PLAYERBET:
                    if (data.content)
                        this.onRecivePlayGame(data.content);
                    break;
                //开始发公共牌
                case Commands.PUSH_PUBLICCARD:
                    if (data.content) {
                        //第一次发公共牌
                        if (data.content.times == 1) {
                            CardUtils.getInstance().putPublicCards(data.content.poker);
                        } else {
                            var cardNumber = data.content.poker[0];
                            CardUtils.getInstance().addPublicCard(cardNumber);
                        }
                        this.sendNotification(GameProxy.POP_PUBLICCARD, data.content);
                    }
                    //this.onRecivePlayGame(data.content);
                    break;
                //给每个人发手牌
                case Commands.PUSH_OWNCARD:
                    this.sendNotification(GameProxy.POP_CARD, data.content);
                    break;
                //游戏判定
                case Commands.RESULT:
                    this.sendNotification(GameProxy.RESULT, data.content);
                    //this.onRecivePlayGame(data.content);
                    break;
            }
        }

        /**房间消息*/
        private onRecivePlayGame(content): void {
            //1-下注/加注，2-让牌，3-全下，4-弃牌
            let action = content.action;
            console.warn('action', action);
            if (action == undefined) return;
            switch (action) {
                case Actions.bet:
                    this.sendNotification(GameProxy.ADD_CHIP, content);
                    // this.my_cards = content.cards.sort(function(a,b){return b-a});
                    // this.refreshMyCard(this.my_cards);
                    break;
                case Actions.call:
                    this.sendNotification(GameProxy.CALL, content);
                    // this.my_cards = content.cards.sort(function(a,b){return b-a});
                    // this.refreshMyCard(this.my_cards);
                    break;
                case Actions.pass:
                    this.sendNotification(GameProxy.CHECK, content);
                    //this.onGamePlay(content);
                    break;
                case Actions.allin:
                    this.sendNotification(GameProxy.AllIN, content);
                    //this.onGameOver(content);
                    break;
                case Actions.giveup:
                    this.sendNotification(GameProxy.FOLD, content);
                    //this.onGameOver(content);
                    break;
            }
        }
        public set nextStep(nextStep: number) {
            this._nextStep = nextStep;
        }
        public get nextStep(): number {
            return this._nextStep;
        }

    }
    /**基本操作代码*/
}
class Actions {
    public static bet = 1;
    public static pass = 2;
    public static allin = 3;
    public static giveup = 4;
    public static call = 5;
    public static giveUpOrPass = 6;
    public static autoPass = 7;
    public static followAny = 8;

}

class Operator {
    public static pass = 1;
    public static follow = 2;
    public static allIn = 3;
}