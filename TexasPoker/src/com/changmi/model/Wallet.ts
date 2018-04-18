class Wallet {

    private _uid: string
    private _address: Array<string>;
    private _utxo: Array<UTXO>;
    private _amount: number;  //聪
    private _removeUtxo: Array<string>; // 已经使用过的utxo

    private static _instance: Wallet;

    public static getInstance() {
        if (!this._instance) {
            this._instance = new Wallet();
            this._instance.uid = "";
            this._instance.address = new Array<string>();
            this._instance.utxo = new Array<UTXO>();
            this._instance.amount = 0;
            this._instance.removeUtxo = new Array<string>();
        }
        return this._instance;
    }

    public initWallet(res: any): void {
        this.utxo = new Array<UTXO>();
        this.amount = 0;
        for (let i = 0; i < res.length; i++) {
            let u: UTXO = new UTXO(res[i]);
            if (this.isUtxoRemoved(u.txid)) {
                continue;
            }
            this.utxo.push(u);
            this.amount += res[i].amount;
        }
    }

    /**
     * 本地数据初始化钱包
     */
    public localWallet(res: any): void {
        for (let i = 0; i < res.length; i++) {
            let utxo = {
                "txid": res[i]._txid,
                "vout": res[i]._vout,
                "address": res[i]._addr,
                "amount": res[i]._amount
            }
            let u: UTXO = new UTXO(utxo);
            this.utxo.push(u);
            this.amount += u.amount;
        }
    }

    public isUtxoRemoved(txid: string): boolean {
        let remove = egret.localStorage.getItem("removeUtxo");
        if (remove != null) {
            let removeUtxo: Array<string> = <Array<string>>JSON.parse(remove);
            console.log("-------------->> isUtxoRemoved: ", removeUtxo);
            for (let i = 0; i < removeUtxo.length; i++) {
                if (removeUtxo[i] == txid) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 获取足够支付的vin
     */
    public getAmountUtxo(money: number): any {
        let value: number = 0;
        let res: Array<UTXO> = new Array<UTXO>();
        for (let i = 0; i < this.utxo.length; i++) {
            value += this.utxo[i].amount;
            res.push(this.utxo[i]);
            if (value > money)
                break;
        }

        // 移除已经使用过的utxo
        for (let k = 0; k < res.length; k++) {
            console.log("===================== remove utxo ===================  ")
            console.log("====remove.txid: ", res[k].txid);
            console.log("====remove.amount: ", res[k].amount);
            this.utxo.shift();
            this.updateRemoveUtxo(res[k].txid);
        }

        this.saveUtxo();
        return res;
    }

    public saveUtxo() {
        egret.localStorage.setItem("utxo", JSON.stringify(this.utxo));
    }

    public updateRemoveUtxo(txid: string) {
        let remove = egret.localStorage.getItem("removeUtxo");
        let removeUtxo: Array<string>;
        if (remove != null) {
            removeUtxo = <Array<string>>JSON.parse(remove);
        } else {
            removeUtxo = new Array<string>();
        }

        for (let n = 0; n < removeUtxo.length; n++) {
            console.log("------------->>> removeUtxo.txid: ", removeUtxo[n]);
        }

        removeUtxo.push(txid);
        egret.localStorage.setItem("removeUtxo", JSON.stringify(removeUtxo));
    }

    public showUtxo() {
        console.log("----  utxo.length: ", this.utxo.length);
        for (let i = 0; i < this.utxo.length; i++) {
            console.log("---- txid: " + this.utxo[i].txid + " -- amount: " + this.utxo[i].amount);
        }
    }

    public showRemoveUtxo() {
        let remove = egret.localStorage.getItem("removeUtxo");
        if (remove != null) {
            let removeUtxo: Array<string> = <Array<string>>JSON.parse(remove);
            console.log("---- removeutxo.length: ", removeUtxo.length);
            for (let i = 0; i < removeUtxo.length; i++) {
                console.log("---- removeutxo: ", removeUtxo[i]);
            }
        }
    }

    public get uid(): string {
        return this._uid;
    }

    public set uid(uid: string) {
        this._uid = uid;
    }

    public get address(): Array<string> {
        return this._address;
    }

    public set address(address: Array<string>) {
        this._address = address;
    }

    public get amount(): number {
        return this._amount;
    }

    public set amount(amount: number) {
        this._amount = amount;
    }

    public get utxo(): Array<UTXO> {
        return this._utxo;
    }

    public set utxo(utxo: Array<UTXO>) {
        this._utxo = utxo;
    }

    public get removeUtxo(): Array<string> {
        return this._removeUtxo;
    }

    public set removeUtxo(removeUtxo: Array<string>) {
        this._removeUtxo = removeUtxo;
    }

}