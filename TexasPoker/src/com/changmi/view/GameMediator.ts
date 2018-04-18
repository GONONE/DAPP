module game {

    export class GameMediator extends puremvc.Mediator implements puremvc.IMediator {
        public static NAME: string = "GameScreenMediator";
        public num = 0;
        public timer_3: egret.Timer;

        public fCanClickBack: boolean;
        public fBlindHasBet: boolean;
        public pokerTimer: egret.Timer;
        private wallet: Wallet = Wallet.getInstance();
        private pokerCache: PokerCache = PokerCache.getInstance();

        private winnerIndex: number = 0;

        public constructor(viewComponent: any) {
            super(GameMediator.NAME, viewComponent);
            this.gameScreen.backBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.backButtonClick, this);
            // this.gameScreen.checkBox_giveUp.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onChange, this);
            // this.gameScreen.checkBox_autoPass.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onChange, this);
            // this.gameScreen.checkBox_followAny.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onChange, this);

            this.gameScreen.giveUpBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.giveupAction, this);
            this.gameScreen.passBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.passAction, this);
            this.gameScreen.addChipBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.addChipAction, this);

            this.gameScreen.MoneyBtnSmallest.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetNum, this);
            this.gameScreen.MoneyBtnSmall.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetNum, this);
            this.gameScreen.MoneyBtnNormal.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetNum, this);
            this.gameScreen.MoneyBtnBig.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetNum, this);
            this.gameScreen.MoneyBtnBiggest.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetNum, this);
            this.gameScreen.RangeMoneyBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetNum, this);


            this.gameScreen.multipleBtn1.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetMul, this);
            this.gameScreen.multipleBtn2.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetMul, this);
            this.gameScreen.multipleBtn3.addEventListener(egret.TouchEvent.TOUCH_TAP, this.countBetMul, this);
            this.gameScreen.users[3].addEventListener(User.GIVEUP, function () {
                console.log("users[3]计时结束.........");
                // this.playerTimeOut();
            }, this);

            this.timer_3 = new egret.Timer(1500, 80);
            this.timer_3.addEventListener(egret.TimerEvent.TIMER_COMPLETE, function () {
                this.sendNotification(ApplicationMediator.ENTER_LOBBY);
                NetController.getInstance().close(NetController.GAMESOCKET);
            }, this);


            this.initPokerTimer();
            this.fBlindHasBet = false;
            this.fCanClickBack = false;
            // 玩家回合倒计时
            this.gameScreen.changePlayer("", UserUtils.getInstance().getUserFromIndex(0).uId);
        }

        public initPokerTimer(): void {
            this.pokerTimer = new egret.Timer(2000, 0);
            this.pokerTimer.addEventListener(egret.TimerEvent.TIMER, this.getTableTxs, this);
            this.pokerTimer.addEventListener(egret.TimerEvent.TIMER_COMPLETE, this.timerComFunc, this);
            this.pokerTimer.start();
        }

        private getTableTxs() {
            let data = '{"tableid": "' + this.pokerCache.tableid + '"}';
            HttpAPI.HttpRelay("getTableTxs", data, this.onGetTableTxsComplete, this);
        }
        private timerComFunc() {
            console.log("计时结束");
        }

        /**
         * 获取该局游戏数据
         */
        public onGetTableTxsComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            // console.log("[onGetTableTxsComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                let txs = JSON.parse(request.response).data.txs;

                // console.log("txs.size: ", txs.length);
                // console.log("pokerCache.size: ", this.pokerCache.size);

                // 小盲下注
                if (txs.length == this.pokerCache.playersize && this.pokerCache.index == 0) {
                    this.blindBet(SMALL_BLIND_BET);
                }

                if (this.pokerCache.curCode != PokerCode.BET || txs.length < this.pokerCache.playersize + 1) {
                    return;
                }
                if (txs.length == this.pokerCache.size) {
                    return;
                }

                for (let i = this.pokerCache.size; i < txs.length; i++) {
                    console.log("============================== Update Content ==============================");
                    if (JSON.parse(txs[i].content).pokercode == PokerCode.BET) {
                        this.updateContent(txs[i].content);
                    }
                }
                this.pokerCache.size = txs.length;

                // TODO
                if (this.pokerCache.size == this.pokerCache.playersize + 1) {
                    TextUtils.showTextTip("小盲下注");
                }
                if (this.pokerCache.size == this.pokerCache.playersize + 2) {
                    TextUtils.showTextTip("大盲下注");
                }

                // 大盲下注
                if (txs.length == this.pokerCache.playersize + 1 && this.pokerCache.index == 1) {
                    this.blindBet(BIG_BLIND_BET);
                }

                if (!this.fBlindHasBet && txs.length > this.pokerCache.playersize + 1) {
                    this.gameScreen.showPassBtn();
                    this.fBlindHasBet = true;
                }
            } else {
                console.log("[ERROR][onGetTableTxsComplete]: code = 0");
                TextUtils.showTextTip("onGetTableTxsComplete error");
            }
        }

        /**
         * 大小盲下注
         */
        public blindBet(bet: number): void {
            if (this.wallet.utxo.length == 0) {
                TextUtils.showTextTip("utxo不足,无法下注");
                console.log("============================== utxo不足,无发下注 ==============================");
                console.log("           utxo.length: ", this.wallet.utxo.length);
                console.log("           wallet.amount: ", this.wallet.amount);
                this.updateUTXO();
                return;
            }

            console.log("---------------- 大小盲下注 ----------------");
            SoundManager.getIns().playSound("all_buttons_mp3");
            this.sendNotification(GameCommand.ACTION, { "action": Actions.bet, "raiseStack": bet });
            this.gameScreen.changeToNoBottom();
        }

        /**
         * 大小盲下注
         */
        public playerTimeOut(): void {
            SoundManager.getIns().playSound("all_buttons_mp3");
            this.sendNotification(GameCommand.ACTION, { "action": Actions.giveup, "raiseStack": 0 });
            this.gameScreen.changeToNoBottom();
            console.log("---------------- 玩家超时弃牌 ----------------");
        }

        /**
         * 更新下注消息
         */
        private updateContent(content: any): void {
            let res = JSON.parse(content);
            this.pokerCache.update(res);
            let curLen = CardUtils.getInstance().getPublicCards().length;

            // 处理下注消息
            if (res.fpubcard) {
                if (res.round + 2 == curLen) {
                    return;
                }
            }

            this.handleBetMessage(res);

            // 其他人都弃牌, 游戏结束
            if (res.fdiscard && res.fgameover) {
                this.pokerHistory();
                return;
            }

            if (res.fgameover) {
                if (res.fpubcard && curLen < 5) {
                    let curLen = CardUtils.getInstance().getPublicCards().length;
                    this.getPubCard(res.round);
                } else {
                    console.log("============================== 公开手牌 ==============================");
                    this.openHand();
                }
            }
        }

        public handleBetMessage(res: any): void {
            let curindex: number = res.curindex;
            let nextindex: number = res.nextindex;

            // 当前玩家下注状态
            let raiseStack: number = UserUtils.getInstance().getUserFromIndex(curindex).money - res.mstake[curindex].stake;
            let action: number = Actions.bet;
            let actionStr: string = GameProxy.ADD_CHIP;
            switch (res.mstatus[curindex].status) {
                case 0:
                    action = Actions.bet;
                    actionStr = GameProxy.ADD_CHIP;
                    break;
                case 1:
                    action = Actions.giveup;
                    actionStr = GameProxy.FOLD;
                    break;
                case 2:
                    action = Actions.allin;
                    actionStr = GameProxy.AllIN;
                    break;
            }

            // 下个玩家可以执行的动作
            let money: number = UserUtils.getInstance().getUserFromIndex(nextindex).money;
            let operator: number = 0;
            let hasbet: number = res.mhasbet[nextindex].hasbet;

            // 跟注/加注 = 1; 让牌/加注 = 2; 弃牌/全下 = 3;
            if (res.fpubcard) {
                operator = 2; // 如果是发公共牌
            }
            else {
                if (hasbet == res.maxbet) {
                    operator = 2;
                } else {
                    if (money > res.maxbet - hasbet) {
                        operator = 1;
                    } else {
                        operator = 3;
                    }
                }
            }

            console.log("============================== 更新下注消息 ==============================");
            console.log("           curindex: ", curindex);
            console.log("           raiseStack: ", raiseStack);
            console.log("           maxbet: ", res.maxbet);
            console.log("           当前玩家下注状态: ", actionStr);

            console.log("           nextindex: ", nextindex);
            console.log("           hasbet: ", hasbet);
            console.log("           money: ", money);
            console.log("           下个玩家的动作: ", operator);
            console.log("============================== 更新下注消息 ==============================");

            let data = {
                "uid": this.pokerCache.addresses[curindex],
                "stake": res.maxbet,
                "action": action,
                "raiseStack": raiseStack,
                "operator": operator,
                "nextplayer": this.pokerCache.addresses[nextindex]
            };
            this.sendNotification(actionStr, data);

            if (res.fpubcard && !res.fgameover) {
                this.getPubCard(res.round);
            }
        }

        /**
         * 获取公共牌
         */
        public getPubCard(round: number): void {
            let data = '{"tableid":"' + this.pokerCache.tableid + '", "round":' + round + '}';
            HttpAPI.HttpTX("getPubCard", data, this.onGetPubCardComplete, this);
            console.log("============================== 发公共牌 ==============================");
            console.log("           round: ", round);
        }
        public onGetPubCardComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onGetPubCardComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                let pubcard = JSON.parse(request.response).data;
                this.openPubCard(pubcard);
            } else {
                console.log("[ERROR][onGetPubCardComplete]: code = 0");
                TextUtils.showTextTip("onGetPubCardComplete error");
            }
        }

        /**
         * 发公共牌
         */
        public openPubCard(pubcard: any): void {
            // 同时发好几轮公共牌
            let multiple: boolean = this.pokerCache.round == 4 ? true : false;
            console.log("-------------- multiple: ", multiple);

            let times: number = 0;
            if (multiple) {
                let len: number = CardUtils.getInstance().getPublicCards().length;
                times = len - 2;
            } else {
                times = this.pokerCache.round;
            }
            console.log("-------------- times: ", times);

            // 公共牌
            let flopData = {
                "multiple": multiple,
                "poker": pubcard,
                "nextplayer": this.pokerCache.addresses[this.pokerCache.nextindex],
                "operator": 2,  //RANG_PAI_JIA
                "times": times,
                "pot": this.pokerCache.jackpot
            };

            if (multiple) {
                this.pokerCache.pubcard = new Array<number>();
            }
            for (let i = 0; i < pubcard.length; i++) {
                this.pokerCache.pubcard.push(pubcard[i]);
            }

            this.pokerCache.fpubcard = false;
            this.pokerCache.curbet = 0;
            this.pokerCache.maxbet = 0;
            for (let i = 0; i < this.pokerCache.playersize; i++) {
                this.pokerCache.hasbet.update(i, 0);
                if (this.pokerCache.status.get(i) == 0)
                    this.pokerCache.status.update(i, -1);
            }

            CardUtils.getInstance().clearPublicCards();
            CardUtils.getInstance().putPublicCards(this.pokerCache.pubcard);

            this.sendNotification(GameProxy.POP_PUBLICCARD, flopData);
            if (this.pokerCache.round != 4) {
                TextUtils.showTextTip("发第" + this.pokerCache.round + "轮公共牌");
            } else {
                TextUtils.showTextTip("发剩余的轮公共牌");
            }
        }

        /**
         * 公开手牌
         */
        public openHand(): void {
            let data = '{"tableid":"' + this.pokerCache.tableid + '"}';
            HttpAPI.HttpTX("openHand", data, this.onOpenHandComplete, this);
        }
        public onOpenHandComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onOpenHandComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                let cards = JSON.parse(request.response).data;
                this.pokerCache.openhand = cards;

                //公开手牌
                let userArray: Array<any> = new Array<any>();
                for (let i = 0; i < cards.length; i += 2) {
                    let user = {
                        "uid": UserUtils.getInstance().getUserFromIndex(i / 2).uId,
                        "holeCards": [cards[i], cards[i + 1]]
                    }
                    userArray.push(user);
                }

                let handData = {
                    "user": userArray
                };
                this.sendNotification(GameProxy.OPEN_HAND, handData);
            } else {
                console.log("[ERROR][onOpenHandComplete]: code = 0");
                TextUtils.showTextTip("onOpenHandComplete error");
            }
        }

        /**
         * 玩家弃牌
         */
        public giveupAction(event?: egret.TouchEvent) {
            if (this.wallet.utxo.length == 0) {
                TextUtils.showTextTip("utxo不足,无法弃牌");
                console.log("============================== utxo不足,无法弃牌 ==============================");
                console.log("           utxo.length: ", this.wallet.utxo.length);
                console.log("           wallet.amount: ", this.wallet.amount);
                this.updateUTXO();
                return;
            }

            console.log("============================== 玩家弃牌  ==============================");
            SoundManager.getIns().playSound("all_buttons_mp3");
            // this.gameScreen.giveChipAction(parseInt(this.gameScreen["baseChipNum"].text), 4);
            this.sendNotification(GameCommand.ACTION, { "action": Actions.giveup, "raiseStack": 0 });
            this.gameScreen.changeToNoBottom();
        }
        /**
         * 玩家跟注
         */
        public passAction(event?: egret.TouchEvent) {
            SoundManager.getIns().playSound("all_buttons_mp3");
            console.log(CachePool.getObj("canBet"));

            if (CachePool.getObj("canBet") > Math.floor(this.wallet.amount / COIN) || this.wallet.utxo.length == 0) {
                TextUtils.showTextTip("utxo不足,无法跟注");
                console.log("============================== utxo不足,无法跟注 ==============================");
                console.log("           utxo.length: ", this.wallet.utxo.length);
                console.log("           wallet.amount: ", this.wallet.amount);
                this.updateUTXO();
                return;
            }

            console.log("============================== 玩家跟注  ==============================");
            this.sendNotification(GameCommand.ACTION, { "action": CachePool.getObj("action"), "raiseStack": CachePool.getObj("canBet") });
            this.gameScreen.changeToNoBottom();
        }
        /**
         * 玩家下注
         */
        public countBetNum(event: egret.TouchEvent) {
            SoundManager.getIns().playSound("all_buttons_mp3");
            // var data: BaseMsg = new BaseMsg();
            // data.command = Commands.PLAYERBET;
            // data.content = { "action": 1, "uId": UserUtils.getInstance().getOwnUser().uId, "tId": "1", "raiseStack": parseInt(event.currentTarget.label) };
            // NetController.getInstance().sendData(NetController.GAMESOCKET, data);

            // this.gameScreen.addChipAnimation(parseInt(event.currentTarget.label), 4);

            if (parseInt(event.currentTarget.label) > Math.floor(this.wallet.amount / COIN) || this.wallet.utxo.length == 0) {
                TextUtils.showTextTip("utxo不足,无法下注");
                console.log("============================== utxo不足,无法下注 ==============================");
                console.log("           utxo.length: ", this.wallet.utxo.length);
                console.log("           wallet.amount: ", this.wallet.amount);
                this.updateUTXO();
                return;
            }

            console.log("============================== 玩家下注 ==============================");
            this.sendNotification(GameCommand.ACTION, { "action": Actions.bet, "raiseStack": parseInt(event.currentTarget.label) });
            // this.sendNotification(GameProxy.CHANGE_STATE, "count_choose");
            this.gameScreen.changeToNoBottom();
        }
        /**
        * 点击下注按钮
        */
        public addChipAction(event: egret.TouchEvent) {
            SoundManager.getIns().playSound("all_buttons_mp3");
            this.sendNotification(GameProxy.CHANGE_STATE, "count_choose");
        }

        public pokerHistory() {
            console.log("============================== Poker History ==============================");

            let cstatus: Array<any> = new Array<any>();
            for (let k = 0; k < this.pokerCache.playersize; k++) {
                let st = {
                    "index": k,
                    "status": this.pokerCache.status.get(k)
                }
                cstatus.push(st);
            }
            let content = {
                "pokercode": PokerCode.HISTORY,
                "jackpot": this.pokerCache.jackpot,
                "mstatus": cstatus,
                "pubcard": this.pokerCache.pubcard,
                "openhand": this.pokerCache.openhand
            }
            this.pokerCache.content = content;
            let tx = this.createHistoryTx();
            HttpAPI.HttpTX("createTx", JSON.stringify(tx), this.onCreateHistoryTxComplete, this);
        }

        public createHistoryTx(): any {
            console.log("---------------------- utxo.length: ", this.wallet.utxo.length);
            console.log("---------------------- wallet.amount: ", this.wallet.amount / COIN);

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
                "value": 1,
                "type": true,
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

            let tx = {
                "vin": vin,
                "vout": vout,
                "pokercode": PokerCode.HISTORY,
                "matchaddr": "",
                "tableid": this.pokerCache.tableid,
                "content": this.pokerCache.content
            };

            this.wallet.amount -= total;
            return tx;
        }

        public onCreateHistoryTxComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onCreateHistoryTxComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                this.postTx(JSON.parse(request.response).data);
            } else {
                console.log("[ERROR][onCreateHistoryTxComplete]: code = 0");
                TextUtils.showTextTip("onCreateHistoryTxComplete error");
            }
        }

        /**
         * 获取utxo
         */
        public updateUTXO(): void {
            console.log("============================== UPDATE UTXO ==============================");
            console.log("           utxo.length: ", this.wallet.utxo.length);
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
                this.pokerCache.curCode = PokerCode.HISTORY;
                this.pokerTimer.reset();
                if (this.pokerCache.fdiscard) {
                    this.allDiscard();
                } else {
                    this.calculateWinner();
                }
            } else {
                console.log("[ERROR][onPostTxComplete]: code = 0");
                TextUtils.showTextTip("onPostTxComplete error");
            }

            this.wallet.showUtxo();
            this.wallet.showRemoveUtxo();
        }

        /**
         * 计算赢家
         */
        public calculateWinner() {
            console.log("============================== Calculate Winner ==============================");

            let mBestGroup: CustomMap = new CustomMap();
            let cu: CardUtils = CardUtils.getInstance();
            let maxNum: number = 0;
            let winner: number = -1;

            for (let n = 0; n < this.pokerCache.playersize; n++) {

                // 如果是弃牌, 不参与计算
                if (this.pokerCache.status.get(n) == 1)
                    continue;

                let sevenCards: Array<Card> = new Array<Card>();
                for (let i = 0; i < 5; i++) {
                    let c: Card = this.typeToCard(this.pokerCache.pubcard[i]);
                    sevenCards.push(c);
                }
                let h1: Card = this.typeToCard(this.pokerCache.openhand[n * 2]);
                let h2: Card = this.typeToCard(this.pokerCache.openhand[n * 2 + 1]);
                sevenCards.push(h1);
                sevenCards.push(h2);

                let res: CardGroups = cu.getMaxCardsFromSevenCards(sevenCards);
                if (maxNum < res.cardNum) {
                    maxNum = res.cardNum;
                    winner = n;
                }
                mBestGroup.add(n, res);
            }

            console.log("           winner is: ", winner);
            this.winnerIndex = winner;
            mBestGroup.get(winner).cards;
            this.showResult(winner, mBestGroup);
        }

        /**
         * 正常结束
         */
        public showResult(winIndex: number, bestGroup: CustomMap): void {
            let userArray: Array<any> = new Array<any>();
            for (let i = 0; i < this.pokerCache.playersize; i++) {
                let fWinner = i == winIndex ? true : false;
                let pokertype: number = 1;
                if (this.pokerCache.status.get(i) != 1) {
                    pokertype = Math.floor(bestGroup.get(i).cardNum / 10000000000);
                }

                let user = {
                    "uid": UserUtils.getInstance().getUserFromIndex(i).uId,
                    "winStake": fWinner ? this.pokerCache.jackpot : 0,
                    "isWinner": fWinner,
                    "pokerType": pokertype - 1
                }
                userArray.push(user);
            }

            let bg: Array<number> = new Array<number>();
            let cards: Array<Card> = bestGroup.get(winIndex).cards;

            for (let k = 0; k < cards.length; k++) {
                bg.push(Math.floor(cards[k].color) * 100 + Math.floor(cards[k].index));
            }
            let data = {
                "discard": false,
                "user": userArray,
                "bestGroup": bg
            };

            this.sendNotification(GameProxy.RESULT, data);
        }

        /**
         * 其他人都弃牌, 游戏结束
         */
        public allDiscard(): void {
            console.log("============================== 其他人都弃牌, 游戏结束 ==============================");

            let userArray: Array<any> = new Array<any>();
            for (let i = 0; i < this.pokerCache.playersize; i++) {
                let fWinner: boolean = this.pokerCache.status.get(i) != 1 ? true : false;

                if (fWinner) {
                    this.winnerIndex = i;
                }

                let user = {
                    "uid": UserUtils.getInstance().getUserFromIndex(i).uId,
                    "winStake": fWinner ? this.pokerCache.jackpot : 0,
                    "isWinner": fWinner,
                }
                userArray.push(user);
            }

            let data = {
                "discard": true,
                "user": userArray
            };

            this.timer_3.reset();
            this.gameScreen.stopTimeRotate();
            this.sendNotification(GameProxy.RESULT, data);
        }

        /**
         * 数字转Card
         */
        public typeToCard(type: number): Card {
            return new Card(type % 100, Math.floor(type / 100));
        }

        /**
         * 赢家创建交易拿回钱
         */
        public winnerGetMoney(): void {
            console.log("============================== 创建最后一笔交易 ==============================");
            let data = '{"tableid": "' + this.pokerCache.tableid + '"}';
            HttpAPI.HttpRelay("getTableTxs", data, this.onGetMoneyComplete, this);
        }
        public onGetMoneyComplete(event: egret.Event): void {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onGetMoneyComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                let txs = JSON.parse(request.response).data.txs;
                let txids: Array<string> = new Array<string>();
                for (let i = 0; i < txs.length; i++) {
                    let content = JSON.parse(txs[i].content);
                    if (content.pokercode == PokerCode.BET) {
                        txids.push(txs[i].txid);
                    }
                }
                console.log("txs.size: ", txs.length);
                console.log("txids.size: ", txids.length);
                let tx = this.createWinTx(txids);
                HttpAPI.HttpTX("createTx", JSON.stringify(tx), this.onCreateWinTxComplete, this);
            } else {
                console.log("[ERROR][onGetMoneyComplete]: code = 0");
                TextUtils.showTextTip("onGetMoneyComplete error");
            }
        }

        private winTimer: egret.Timer; // 签名未成功, 每隔4秒继续请求

        public onCreateWinTxComplete(event: egret.Event) {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onCreateWinTxComplete]: ", request.response);

            if (JSON.parse(request.response).code) {
                let res = JSON.parse(request.response).data
                let data = {
                    "txid": res.txid,
                    "hex": res.hex,
                    "tableid": this.pokerCache.tableid,
                    "content": this.pokerCache.content
                };
                console.log("============================== 签名成功 ==============================");
                HttpAPI.HttpRelay("postTx", JSON.stringify(data), this.onPostWinnerTxComplete, this);
                this.winTimer.reset();
            } else {
                console.log("============================== 签名失败 ==============================");
            }

            // 保存未使用的UTXO
            this.fCanClickBack = true;
        }

        public onPostWinnerTxComplete(event: egret.Event) {
            let request = <egret.HttpRequest>event.currentTarget;
            console.log("[onPostWinnerTxComplete]: ", request.response);

            // this.fCanClickBack = true;
            console.log("============================== 游戏彻底结束 ==============================");
        }

        public createWinTx(txids: Array<string>) {
            console.log("---------------------- utxo.length: ", this.wallet.utxo.length);
            console.log("---------------------- wallet.amount: ", this.wallet.amount / COIN);

            // create vin
            let vin: Array<any> = new Array<any>();
            for (let i = 0; i < txids.length; i++) {
                let vinItem = {
                    "txid": txids[i],
                    "vout": 2
                }
                vin.push(vinItem);
            }

            // create vout
            let vout: Array<any> = new Array<any>();
            let winVout = {
                "value": this.pokerCache.jackpot - DEFAULT_TX_FEE / COIN,
                "type": 0,
                "address": this.pokerCache.addresses[this.winnerIndex]
            }
            let dataVout = {
                "value": 0,
                "type": 1,
                "address": this.pokerCache.addresses[this.winnerIndex]
            }
            vout.push(winVout);
            vout.push(dataVout);

            let tx = {
                "vin": vin,
                "vout": vout,
                "pokercode": PokerCode.WINNER,
                "matchaddr": "",
                "tableid": this.pokerCache.tableid,
                "content": {
                    "winnerIndex": this.winnerIndex
                }
            };

            return tx;
        }

        /**
         * 点击返回按钮
         */
        public backButtonClick(event: egret.TouchEvent) {
            if (!this.fCanClickBack) {
                return;
            }
            this.pokerCache.clear();
            console.warn("点击返回");
            this.sendNotification(ApplicationMediator.ENTER_LOBBY);
            AnimationUtils.getInstance().removeAllAnimation();
            this.gameScreen.stopMyRotate();
            this.timer_3.reset();
            this.pokerTimer.reset();
            CachePool.clearAll();
            UserUtils.getInstance().clearAllUser();
            CardUtils.getInstance().clearPublicCards();
            UserUtils.getInstance().getOwnUser().clearcards();
            this.gameScreen.hideOwnCards();
            this.gameScreen.hideAllUserAndChip();
            this.gameScreen.hideOtherCardsAndResetName();
            this.gameScreen.hidePublicCard();
            this.sendNotification(LobbyMediator.REFRESH_USERDATA);
        }

        ///处理复选框的change事件回调
        private onChange(event: egret.TouchEvent) {
            SoundManager.getIns().playSound("all_buttons_mp3");
            ///获得当前复选框
            let checkBox: eui.CheckBox = <eui.CheckBox>event.target;
            let preAction: number;
            switch (checkBox.name) { //强行单选化
                case "giveUpOrPass": {
                    this.gameScreen.checkBox_autoPass.selected = false;
                    this.gameScreen.checkBox_followAny.selected = false;
                    preAction = Actions.giveUpOrPass;
                    break;
                }
                case "autoPass": {
                    this.gameScreen.checkBox_giveUp.selected = false;
                    this.gameScreen.checkBox_followAny.selected = false;
                    preAction = Actions.autoPass;
                    break;
                }
                case "followAny": {
                    this.gameScreen.checkBox_giveUp.selected = false;
                    this.gameScreen.checkBox_autoPass.selected = false;
                    preAction = Actions.followAny;
                    break;
                }
            }
            // 记录下此时的CheckBox状态，待到轮到自己的时候再取出信息，根据信息判断下一步操作发送什么信息
            this.sendNotification(GameCommand.ACTION, event.currentTarget.name);


            CachePool.addObj("preCheckBox", checkBox);
            if (checkBox.currentState == "disabled" || checkBox.currentState == "disabledAndSelected") {
                // label.text = "禁用状态，无法选择";
            } else {
                ///获得当前复选框的标签并显示出来
                console.log(checkBox.selected);
                if (checkBox.selected) {
                    CachePool.addObj("preAction", preAction);
                } else {
                    CachePool.clear("preAction");
                }
                ///取消显示设置复选框的状态，由内部的 getCurrentState() 决定。
                // checkBox.currentState = null;
            }

        }

        public listNotificationInterests(): Array<any> {
            return [
                GameProxy.CHANGE_STATE,
                GameProxy.ADD_USER,
                GameProxy.REM_USER,
                GameProxy.ADD_CHIP,
                GameProxy.POP_CARD,
                GameProxy.FOLD,
                GameProxy.CHECK,
                GameProxy.CALL,
                GameProxy.AllIN,
                GameProxy.POP_PUBLICCARD,
                GameProxy.OPEN_HAND,
                GameProxy.RESULT,
                GameProxy.GAME_RESET
            ];
        }

        public handleNotification(notification: puremvc.INotification): void {
            var data: any = notification.getBody();
            this.playMp3(notification.getName());
            switch (notification.getName()) {
                case GameProxy.CHANGE_STATE: {
                    this.gameScreen.switchBottomState(<String><any>data);
                    break;
                }
                case GameProxy.ADD_USER: {
                    this.gameScreen.addOneUserAction(<User><any>data);
                    break;
                }
                case GameProxy.REM_USER: {
                    this.gameScreen.removeOneUserAction(<number><any>data);
                    break;
                }
                case GameProxy.FOLD:
                    this.gameScreen.playerFold(data.uid, data.raiseStack);
                case GameProxy.ADD_CHIP:
                case GameProxy.CALL:
                case GameProxy.AllIN:
                    this.userAddChip(data.uid, data.raiseStack);
                case GameProxy.CHECK:
                    {
                        console.log("=============================UserUtils.getInstance().getOwnUser().uId: ", UserUtils.getInstance().getOwnUser().uId);

                        this.gameScreen.changePlayer(data.uid, data.nextplayer);
                        if (data.uid == UserUtils.getInstance().getOwnUser().uId) {
                            CachePool.addObj("ownBet", data.stake);
                        }
                        if (data.nextplayer == UserUtils.getInstance().getOwnUser().uId) {
                            SoundManager.getIns().playSound("remind_me_mp3");
                            let ownBet = CachePool.getObj("ownBet");
                            if (!ownBet)
                                ownBet = 0;

                            console.log("=============================data.operator: ", data.operator);
                            console.log("=============================data.stake: ", data.stake);

                            CachePool.addObj("canBet", data.stake - ownBet);
                            if (!this.changeBtnState(data.operator, data.stake)) {
                                this.gameScreen.switchBottomState("first_Bet");
                            }
                        } else if (data.nextplayer != "") {
                            // this.gameScreen.switchBottomState("three_choose");
                            this.gameScreen.changeToNoBottom();
                        }
                    }
                    break;
                case GameProxy.POP_CARD: {
                    this.userGetCards(data.holeCards);
                    break;
                }
                case GameProxy.POP_PUBLICCARD: {
                    this.gameScreen.sendMoneyAnimation();
                    this.gameScreen.sendPublicCard(data.times, data.multiple);
                    this.gameScreen.changePlayer("", data.nextplayer);

                    CachePool.clear("ownBet");

                    if (data.nextplayer == UserUtils.getInstance().getOwnUser().uId) {
                        if (!this.changeBtnState(data.operator, 0)) {
                            this.gameScreen.switchBottomState("first_Bet");
                        }
                    } else {
                        // this.gameScreen.switchBottomState("three_choose");
                        this.gameScreen.changeToNoBottom();
                    }

                    // 发完公共牌检查是否要发手牌
                    if (this.pokerCache.fgameover && CardUtils.getInstance().getPublicCards().length == 5) {
                        this.openHand();
                    }

                    break;
                }
                case GameProxy.OPEN_HAND: {

                    let userArray: Array<any> = data.user;
                    // 显示手牌
                    for (let i = 0; i < userArray.length; i++) {
                        let user: User = UserUtils.getInstance().getUserFromUid(userArray[i].uid);
                        if (user) {
                            this.gameScreen.showUserCards(userArray[i].holeCards, user.seat);
                        }
                    }
                    this.timer_3.reset();
                    this.gameScreen.stopTimeRotate();

                    this.pokerHistory();

                    // rpc pokerhistory
                    // let params = '{"jsonrpc":"1.0", "id":"curltest", "method":"pokerhistory", "params":[]}';
                    // HttpAPI.HttpPost(params, this.onPokerHistoryComplete, this);

                    break;
                }
                case GameProxy.RESULT: {
                    this.gameScreen.changeToNoBottom();
                    this.gameScreen.sendMoneyAnimation();

                    let userArray: Array<any> = data.user;
                    // 给钱动画和显示手牌
                    for (let i = 0; i < userArray.length; i++) {
                        let user: User = UserUtils.getInstance().getUserFromIndex(i);
                        if (user) {
                            console.log("++++++++++++ user.seat: ", user.seat);
                            console.log("++++++++++++ userArray[i].winStake: ", userArray[i].winStake);
                            console.log("++++++++++++ userArray[i].uid: ", userArray[i].uid);
                            // 给钱
                            this.gameScreen.giveChipAction(userArray[i].winStake, user.seat);
                            // 显示手牌
                            // this.gameScreen.showUserCards(userArray[i].holeCards, user.seat);
                            // 改牌型文本
                            if (!data.discard) {
                                this.gameScreen.changeUserNameLabelToCardShape(CardResult[userArray[i].pokerType], user.seat);
                            }
                        } else {
                            AnimationUtils.getInstance().changeLabelNumber(this.gameScreen["baseChipNum"], -userArray[i].winStake);
                        }
                    }
                    // 显示高亮牌
                    if (!data.discard) {
                        this.gameScreen.showHeightLightPublicCard(data.bestGroup, data.user);
                    }

                    if (this.winnerIndex != this.pokerCache.index) {
                        console.log("============================== 胜败乃兵家常事, 少年请重头再来 ==============================");
                        // 保存未使用的UTXO
                        this.fCanClickBack = true;
                        this.wallet.saveUtxo();
                        return;
                    }
                    this.winTimer = new egret.Timer(2000, 0);
                    this.winTimer.addEventListener(egret.TimerEvent.TIMER, this.winnerGetMoney, this);
                    this.winTimer.addEventListener(egret.TimerEvent.TIMER_COMPLETE, this.timerComFunc, this);
                    this.winTimer.start();
                    break;
                }
                case GameProxy.GAME_RESET: {
                    this.timer_3.stop();
                    UserUtils.getInstance().getOwnUser().clearcards();
                    UserUtils.getInstance().clearAllUser();
                    this.gameScreen.hideOwnCards();
                    this.gameScreen.hideAllUserAndChip();
                    this.gameScreen.hideOtherCardsAndResetName();
                    this.gameScreen.hidePublicCard();
                    CachePool.clearAll();
                    break;
                }
            }
        }
        public get gameScreen(): GameScreen {
            return <GameScreen><any>(this.viewComponent);
        }

        public playMp3(action: string) {
            switch (action) {
                case GameProxy.FOLD:
                    SoundManager.getIns().playSound("male_discard_mp3");
                    break;
                case GameProxy.ADD_CHIP:
                    SoundManager.getIns().playSound("male_plus_mp3");
                    break;
                case GameProxy.AllIN:
                    SoundManager.getIns().playSound("male_allin_mp3");
                    break;
                case GameProxy.CALL:
                    SoundManager.getIns().playSound("male_with_mp3");
                    break;
                case GameProxy.CHECK:
                    SoundManager.getIns().playSound("too_mp3");
                    break;
            }
        }

        public countBetMul(event: egret.TouchEvent) {
            console.log(<eui.Button>event.currentTarget.label);
        }

        public userAddChip(uId: string, chip: number) {
            var seat: number = UserUtils.getInstance().getUserFromUid(uId).seat;
            this.gameScreen.addChipAnimation(chip, seat, uId);
        }

        public userGetCards(cards: Array<number>) {
            UserUtils.getInstance().getOwnUser().initcards(cards);
            this.gameScreen.beginAnimation();
        }

        public changeBtnState(operator: number, stake: number): boolean {
            let preAction = CachePool.getObj("preAction");
            let preActionIsExecute: boolean = false;
            switch (operator) {
                case StateCode.FOLLOWBET:
                    this.gameScreen.passBtn.label = "跟    注";
                    CachePool.addObj("action", Actions.call);
                    if (preAction && (preAction == Actions.followAny)) {
                        this.passAction();
                        preActionIsExecute = true;
                    } else if (preAction == Actions.giveUpOrPass) {
                        this.giveupAction();
                        preActionIsExecute = true;
                    }
                    break;
                case StateCode.PASSBET:
                    this.gameScreen.passBtn.label = "让    牌";
                    CachePool.addObj("action", Actions.pass);
                    if (preAction && (preAction == Actions.autoPass || preAction == Actions.giveUpOrPass || preAction == Actions.followAny)) {
                        this.passAction();
                        preActionIsExecute = true;
                    }
                    break;
                case StateCode.JUSTALLIN:
                    this.gameScreen.passBtn.label = "全    下";
                    CachePool.addObj("action", Actions.allin);
                    this.gameScreen.addChipBtn.alpha = 0.5;
                    this.gameScreen.addChipBtn.touchEnabled = false;
                    if (preAction && (preAction == Actions.giveUpOrPass)) {
                        this.giveupAction();
                        preActionIsExecute = true;
                    } else if (preAction && (preAction == Actions.followAny)) {
                        this.passAction();
                        preActionIsExecute = true;
                    }
                    break;
            }
            let checkBox = (<eui.CheckBox>CachePool.getObj("preCheckBox"));
            if (checkBox) {
                checkBox.selected = false;
            }
            CachePool.clear("preAction");
            if (operator != StateCode.JUSTALLIN) {
                this.gameScreen.addChipBtn.alpha = 1;
                this.gameScreen.addChipBtn.touchEnabled = true;
            } else {
                return preActionIsExecute;
            }

            var ownBet = CachePool.getObj("ownBet") ? CachePool.getObj("ownBet") : 0;
            var minimun = stake - ownBet;
            var maximum = this.gameScreen.users[3].money > 5000 + minimun ? 5000 + minimun : this.gameScreen.users[3].money;
            this.gameScreen.RangeMoneySlider.minimum = minimun;
            this.gameScreen.RangeMoneySlider.snapInterval = 100;
            this.gameScreen.RangeMoneySlider.maximum = maximum;
            this.gameScreen.RangeMoneySlider.value = minimun;
            this.gameScreen.RangeMoneySlider["change"].mask = new egret.Rectangle(0, 30 + this.gameScreen.RangeMoneySlider.height * 0.82, 26, 0);
            this.gameScreen.RangeMoneyBtn.label = "" + minimun;

            for (let i = 0; i < this.gameScreen.count_group.numChildren - 2; i++) {
                let money: eui.Button = <eui.Button>this.gameScreen.count_group.getChildAt(i);
                (parseInt(money.label) >= minimun && parseInt(money.label) <= maximum) ? (money.alpha = 1, money.touchEnabled = true) : (money.alpha = 0.5, money.touchEnabled = false);
            }
            return preActionIsExecute;
        }
    }
}