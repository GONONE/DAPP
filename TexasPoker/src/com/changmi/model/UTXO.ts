class UTXO {

    private _txid: string;
    private _vout: number;
    private _addr: string;
    private _amount: number;

    public constructor(json: any) {
        this._txid = json.txid;
        this._vout = json.vout;
        this._addr = json.address;
        this._amount = json.amount;
    }

    public get txid(): string {
        return this._txid;
    }

    public set txid(txid: string) {
        this._txid = txid;
    }

    public get vout(): number {
        return this._vout;
    }

    public set vout(vout: number) {
        this._vout = vout;
    }

    public get addr(): string {
        return this._addr;
    }

    public set addr(addr: string) {
        this._addr = addr;
    }

    public get amount(): number {
        return this._amount;
    }

    public set amount(amount: number) {
        this._amount = amount;
    }

}