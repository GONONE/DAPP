
const RELAY_SERVER: string = "http://47.92.71.218:8000/";
// const RELAY_SERVER: string = "http://192.168.1.250:9001/";
const TX_SERVER: string = "http://47.97.175.117:9000/";
// const TX_SERVER: string = "http://192.168.1.250:9000/";

class HttpAPI {

    public constructor() {
    }

    public static HttpRelay(method: string, data: any, onComplete: (event?: egret.Event) => void, thisObj: any): void {
        let request = new egret.HttpRequest();
        request.responseType = egret.HttpResponseType.TEXT;
        request.setRequestHeader("Content-Type", "text/plain");
        request.setRequestHeader("Access-Control-Allow-Origin", "*");
        request.open(RELAY_SERVER + method, egret.HttpMethod.POST);
        request.send(data);
        request.addEventListener(egret.Event.COMPLETE, onComplete, thisObj);
        request.addEventListener(egret.IOErrorEvent.IO_ERROR, this.onHttpError, thisObj);

        if (method != "getTableTxs" && method != "getTableID") {
            console.log("[HttpRelay.url]: ", RELAY_SERVER + method);
            console.log("[HttpRelay.data]: ", data);
        }
    }

    public static HttpTX(method: string, data: any, onComplete: (event?: egret.Event) => void, thisObj: any): void {
        let request = new egret.HttpRequest();
        request.responseType = egret.HttpResponseType.TEXT;
        request.setRequestHeader("Content-Type", "text/plain");
        request.setRequestHeader("Access-Control-Allow-Origin", "*");
        request.open(TX_SERVER + method, egret.HttpMethod.POST);
        request.send(data);
        request.addEventListener(egret.Event.COMPLETE, onComplete, thisObj);
        request.addEventListener(egret.IOErrorEvent.IO_ERROR, this.onHttpError, thisObj);
        console.log("[HttpTX.url]: ", TX_SERVER + method);
        console.log("[HttpTX.data]: ", data);
    }

    public static onHttpError(event: egret.IOErrorEvent): void {
        console.log("onHttpError: ", event);
    }

    /**
     * HTTP GET
     * @param path          请求路径
     * @param param         参数列表
     * @param onComplete    请求成功回调
     * @param onIOError     请求失败回调
     * @param thisObj       this目标
     */
    public static HttpGET(path: string, param: any, onComplete: (event?: egret.Event) => void, onIOError: (event?: egret.IOErrorEvent) => void, thisObj: any): void {
        let url: string = param ? `${path}?${encodeURI(this.encode(param))}` : path;
        let request: egret.HttpRequest = new egret.HttpRequest();
        request.responseType = egret.HttpResponseType.TEXT;
        request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
        request.addEventListener(egret.Event.COMPLETE, onComplete, thisObj);
        request.addEventListener(egret.IOErrorEvent.IO_ERROR, onIOError, thisObj);
        request.open(url, egret.HttpMethod.GET);
        request.send();
    }


    public static HttpPost(data: any, onComplete: (event?: egret.Event) => void, thisObj: any): void {
        let request = new egret.HttpRequest();
        request.responseType = egret.HttpResponseType.TEXT;
        request.setRequestHeader("Content-Type", "text/plain");
        request.setRequestHeader("Authorization", "Basic " + UserUtils.getInstance().getOwnUser().pokerNamePass);
        request.open("http://" + UserUtils.getInstance().getOwnUser().pokerIp + ":8332", egret.HttpMethod.POST);
        request.send(data);
        request.addEventListener(egret.Event.COMPLETE, onComplete, thisObj);
        request.addEventListener(egret.IOErrorEvent.IO_ERROR, this.onHttpError, thisObj);
        console.log("##HttpPost-data : ", data);
    }

    private static encode(data: any): string {
        let paramURL: string = '';
        for (let key in data) {
            paramURL += `${key}=${data[key]}&`
        }
        if (paramURL.length > 1) {
            return `${paramURL.substring(0, paramURL.length - 1)}`
        }
        return paramURL;
    }
}
