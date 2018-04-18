
class PokerCache {

    private _matchTxid: string
    private _tableid: string;
    private _index: number;
    private _myAddress: string;       // 我的地址
    private _addresses: Array<string>;// 所有玩家地址
    private _pokerAddress: string;    // 多签地址
    private _playersize: number;

    private _balance: CustomMap;
    private _curCode: number;
    private _size: number;

    private _handCard: Array<number>;

    private _curindex: number;
    private _nextindex: number;
    private _curbet: number;
    private _maxbet: number;
    private _jackpot: number;
    private _fpubcard: boolean;
    private _fgameover: boolean;
    private _fdiscard: boolean;

    private _hasbet: CustomMap;
    private _stake: CustomMap;
    private _status: CustomMap;
    private _round: number;
    private _pubcard: Array<number>;
    private _openhand: Array<number>;

    private _content: any;

    private static _instance: PokerCache;

    public static getInstance() {
        if (!this._instance) {
            this._instance = new PokerCache();
            this._instance.matchTxid = "";
            this._instance.tableid = "";
            this._instance.index = -1;
            this._instance.myAddress = "";
            this._instance.addresses = new Array<string>();
            this._instance.pokerAddress = "";
            this._instance.playersize = 0;
            this._instance.balance = new CustomMap();
            this._instance.curCode = PokerCode.MATCH;
            this._instance.size = 0;
            this._instance.handCard = new Array<number>();

            this._instance.curindex = 0;
            this._instance.nextindex = 0;
            this._instance.curbet = 0;
            this._instance.maxbet = 0;
            this._instance.jackpot = 0;
            this._instance.fpubcard = false;
            this._instance.fgameover = false;
            this._instance.fdiscard = false;
            this._instance.round = 0;
            this._instance.hasbet = new CustomMap();
            this._instance.stake = new CustomMap();
            this._instance.status = new CustomMap();
            this._instance.pubcard = new Array<number>();
            this._instance.openhand = new Array<number>();
        }
        return this._instance;
    }

    public clear() {
        this.matchTxid = "";
        this.tableid = "";
        this.index = -1;
        this.myAddress = "";
        this.addresses = new Array<string>();
        this.pokerAddress = "";
        this.playersize = 0;
        this.balance = new CustomMap();
        this.curCode = PokerCode.MATCH;
        this.size = 0;
        this.handCard = new Array<number>();

        this.curindex = 0;
        this.nextindex = 0;
        this.curbet = 0;
        this.maxbet = 0;
        this.jackpot = 0;
        this.fpubcard = false;
        this.fgameover = false;
        this.fdiscard = false;
        this.round = 0;
        this.hasbet = new CustomMap();
        this.stake = new CustomMap();
        this.status = new CustomMap();
        this.pubcard = new Array<number>();
        this.openhand = new Array<number>();
    }

    /**
     * 更新交易数据
     */
    public update(content: any) {
        this.curindex = content.curindex;
        this.nextindex = content.nextindex;
        this.curbet = content.curbet;
        this.maxbet = content.maxbet;
        this.jackpot = content.jackpot;
        this.fpubcard = content.fpubcard;
        this.fgameover = content.fgameover;
        this.fdiscard = content.fdiscard;
        this.round = content.round;

        for (let i = 0; i < this.playersize; i++) {
            this.hasbet.update(i, content.mhasbet[i].hasbet);
            this.stake.update(i, content.mstake[i].stake);
            this.status.update(i, content.mstatus[i].status);
        }

        this.pubcard = content.pubcard;
        this.openhand = content.openhand;
    }

    public get matchTxid(): string {
        return this._matchTxid;
    }
    public set matchTxid(matchTxid: string) {
        this._matchTxid = matchTxid;
    }
    public get tableid(): string {
        return this._tableid;
    }
    public set tableid(tableid: string) {
        this._tableid = tableid;
    }
    public get index(): number {
        return this._index;
    }
    public set index(index: number) {
        this._index = index;
    }
    public get myAddress(): string {
        return this._myAddress;
    }
    public set myAddress(myAddress: string) {
        this._myAddress = myAddress;
    }
    public get addresses(): Array<string> {
        return this._addresses;
    }
    public set addresses(addresses: Array<string>) {
        this._addresses = addresses;
    }
    public get pokerAddress(): string {
        return this._pokerAddress;
    }
    public set pokerAddress(pokerAddress: string) {
        this._pokerAddress = pokerAddress;
    }
    public get playersize(): number {
        return this._playersize;
    }
    public set playersize(playersize: number) {
        this._playersize = playersize;
    }
    public get size(): number {
        return this._size;
    }
    public set size(size: number) {
        this._size = size;
    }
    public get balance(): CustomMap {
        return this._balance;
    }
    public set balance(balance: CustomMap) {
        this._balance = balance;
    }
    public get curCode(): number {
        return this._curCode;
    }
    public set curCode(curCode: number) {
        this._curCode = curCode;
    }
    public get handCard(): Array<number> {
        return this._handCard;
    }
    public set handCard(handCard: Array<number>) {
        this._handCard = handCard;
    }

    public get curindex(): number {
        return this._curindex;
    }
    public set curindex(curindex: number) {
        this._curindex = curindex;
    }
    public get nextindex(): number {
        return this._nextindex;
    }
    public set nextindex(nextindex: number) {
        this._nextindex = nextindex;
    }
    public get curbet(): number {
        return this._curbet;
    }
    public set curbet(curbet: number) {
        this._curbet = curbet;
    }
    public get maxbet(): number {
        return this._maxbet;
    }
    public set maxbet(maxbet: number) {
        this._maxbet = maxbet;
    }
    public get jackpot(): number {
        return this._jackpot;
    }
    public set jackpot(jackpot: number) {
        this._jackpot = jackpot;
    }
    public get fpubcard(): boolean {
        return this._fpubcard;
    }
    public set fpubcard(fpubcard: boolean) {
        this._fpubcard = fpubcard;
    }
    public get fgameover(): boolean {
        return this._fgameover;
    }
    public set fgameover(fgameover: boolean) {
        this._fgameover = fgameover;
    }
    public get fdiscard(): boolean {
        return this._fdiscard;
    }
    public set fdiscard(fdiscard: boolean) {
        this._fdiscard = fdiscard;
    }
    public get round(): number {
        return this._round;
    }
    public set round(round: number) {
        this._round = round;
    }
    public get hasbet(): CustomMap {
        return this._hasbet;
    }
    public set hasbet(hasbet: CustomMap) {
        this._hasbet = hasbet;
    }
    public get stake(): CustomMap {
        return this._stake;
    }
    public set stake(stake: CustomMap) {
        this._stake = stake;
    }
    public get status(): CustomMap {
        return this._status;
    }
    public set status(status: CustomMap) {
        this._status = status;
    }
    public get pubcard(): Array<number> {
        return this._pubcard;
    }
    public set pubcard(pubcard: Array<number>) {
        this._pubcard = pubcard;
    }
    public get openhand(): Array<number> {
        return this._openhand;
    }
    public set openhand(openhand: Array<number>) {
        this._openhand = openhand;
    }

    public get content(): any {
        return this._content;
    }
    public set content(content: any) {
        this._content = content;
    }

}