/**
 * Created by huangyanfeng on 2017/4/19.
 * description：天眼客户端系统-数据采集模块
 */
(function () {

  /*
   * @class 系统自定义配置
   * @FIELD 缓存字段 需要项目登录后配置USER_LOGIN_TEL为本地存储，用以获取客户登录的手机号
   * @APP APP版本号 产品编码 每次更新增量包时需手动设置为最新版本号以及产品编码
   * @FLAG 接口成功标识符
   * @FUN 功能模块简称，用以辅助记录数据内容
   * @SWITCHSTATE 默认开关配置，系统登录后从本地缓存获取数据后更新
   * */
  var config = {
    PATH: {
      SWITCHURL: 'http://localhost:8099/gathering/getSwitch.do',
      REPORTURL: 'http://localhost:8099/gathering/submit.do'
    },
    FIELD: {
      SWITCH: 'SWITCH_STATE_DATA',
      TAGVALUE: 'SWITCH_STATE_TAGVALUE',
      DURATION: 'SWITCH_OFF_DURATION',
      TRAJECTORY: 'TRAJECTORY_COLLECTION_DATA',
      USERID: 'USER_IDENTITY_ID',
      LOGINFO: 'USER_LOGIN_TEL'
    },
    APP: {
      UPCCODE: '021',
      SSENV: 'DEV',
      VERSION: '5.5.0'
    },
    FLAG: {
      SUCCESS: '1'
    },
    FUN: {
      INTERFACE: 'ie',
      MONITOR: 'ee',
      CODEERROR: 'er'
    },
    SWITCHSTATE: {
      switch: 'Y',
      isAll: 'Y',
      critical: '3',
      config: {
        interface: 'Y',
        monitor: 'Y',
        buriedPoint: 'N',
        codeError: 'Y'
      }
    }
  };

  /******************************* 数据处理模块 ******************************/

  /*
   * @createStore 创建页面
   * @createContainer 创建缓存
   * @addData 记录数据
   * @getDevice 获取设备信息
   * */
  var createStore = function () {
    return {
      pageUrl: window.location.pathname.split('/')[1],//页面地址
      timeAxis: new Date().getTime(),//时间节点
      interFace: [],//接口
      eventType: [],//操作轨迹
      codeWrong: [],//代码异常
      errorFlag: 'N'//默认值为N
    }
  };

  var createContainer = function () {
    var container = {},
      localData = localStorage.getItem(config.FIELD.TRAJECTORY);
    if (localData) {
      container = JSON.parse(localData);
      if (container.dataSet.length >= parseInt(config.SWITCHSTATE.critical)) {
        if (config.SWITCHSTATE.isAll == 'Y') {
          //如配置开关为“上传所有”则触发数据上报
          submitData();
        } else {
          //移除本地缓存数据，重新构建缓存
          localStorage.removeItem(config.FIELD.TRAJECTORY);
          arguments.callee();
          return;
        }
      }
    } else {
      container.dataSet = [];
    }
    container.dataSet.push(createStore());
    localStorage.setItem(config.FIELD.TRAJECTORY, JSON.stringify(container));
  };

  var addData = function (type, data) {
    var pathName = window.location.pathname.split('/')[1],//获取当前页面地址
      localData = JSON.parse(localStorage.getItem(config.FIELD.TRAJECTORY));//获取本地存储数据
    if(!localData){
      return;
    }
    if (pathName != localData.dataSet[localData.dataSet.length - 1].pageUrl) {
      //如检测到前页面地址与最后一次记录的地址不一致，则重新建一个页面的缓存
      localData.dataSet.push(createStore());
    }
    switch (type) {
      case config.FUN.INTERFACE:
        localData.dataSet[localData.dataSet.length - 1].interFace.push(data);
        break;
      case config.FUN.MONITOR:
        localData.dataSet[localData.dataSet.length - 1].eventType.push(data);
        break;
      case config.FUN.CODEERROR:
        localData.dataSet[localData.dataSet.length - 1].codeWrong.push(data);
        break;
    }
    localStorage.setItem(config.FIELD.TRAJECTORY, JSON.stringify(localData));
  };

  var getDevice = function () {
    var userAgent = navigator.userAgent;
    return {
      app: (function () {
        if (userAgent.indexOf('Android') > -1 || userAgent.indexOf('Adr') > -1) {
          return 'Android'
        } else if (!!userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
          return 'IOS'
        }
      })(),
      version: navigator.appVersion
    };
  };

  var xmlHttp = function (url,type,data) {
    var xml,params = 'prCode='+data;
    if (window.XMLHttpRequest) {
      xml = new XMLHttpRequest();
    } else {
      xml = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xml.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xml.onreadystatechange = function () {
      if (xml.readyState == 4 && xml.status == 200) {
        console.log(xml);
      }
    };
    xml.open(type, url);
    xml.send(params);
  };

  /******************************* 请求开关配置 数据上传模块 ******************************/

  /*
   * @updateSwitch 获取、更新开关配置
   * @submitData 数据上传
   * */
  var updateSwitch = function (prCode) {
    console.log('-----start 开始获取配置信息！-----');
    //if(!!$){
    //  $.ajax({
    //    url: config.PATH.SWITCHURL,
    //    type: 'get',
    //    data: {
    //      prCode: prCode
    //    },
    //    header: {
    //      "Origin": "http://localhost:8877"
    //    },
    //    success: function (res) {
    //      console.log(res);
    //      if (res && res.flag == '1') {
    //        console.log('-----end 配置信息获取结束！------');
    //        //存储标记值
    //        localStorage.setItem(config.FIELD.TAGVALUE,res.data.tagValue);
    //        //存储时长
    //        localStorage.setItem(config.FIELD.DURATION,res.data.duration);
    //        //更新本地存储开关配置信息
    //        localStorage.setItem(config.FIELD.SWITCH,JSON.stringify(res.data));
    //        console.log('-----重新启动系统！------');
    //        //启动插件
    //        startUp();
    //      }
    //    }
    //  });
    //  return;
    //}
   xmlHttp(config.PATH.SWITCHURL,'get',prCode)
  };

  var submitData = function () {
    console.log('-----start 开始数据上传-----');
    var handler, xml,
      tagValue = localStorage.getItem(config.FIELD.TAGVALUE),
      paramer = {
        prCode: config.APP.UPCCODE,//产品编码
        version: config.APP.VERSION,//APP版本号
        accountId: localStorage.getItem(config.FIELD.USERID) ? localStorage.getItem(config.FIELD.USERID) : '13670838562',//用户登录手机号
        timeAxis: new Date().getTime(),//上传时间点
        dataSet: JSON.parse(localStorage.getItem(config.FIELD.TRAJECTORY)),//数据集
        deviceInfo: getDevice()//设备相关信息
      };
    console.log(paramer);
    if (!!$) {
      $.ajax({
        url: config.PATH.REPORTURL,
        type: 'post',
        data: paramer,
        header: {
          "Origin": "http://localhost:8877"
        },
        success: function (res) {
          console.log(res);
          if (res && res.flag == '1') {
            //数据提交后清除本地缓存数据
            console.log('-----end 数据上传结束！-----');
            localStorage.removeItem(config.FIELD.TRAJECTORY);
            //是否需要更新开关配置
            if(!tagValue || res.data.tagValue != tagValue){
              console.log('----- start 开关配置信息发生变更，重新请求配置信息！-----');
              //调用更新开关配置接口
              updateSwitch(res.data.prCode);
            } else {
              console.log('----- 开关配置信息未发生变更，重新构建缓存！-----');
              //重新构建本地缓存
              createContainer();
            }
          }
        },
        error: function () {
          //10秒后重新发起请求
          handler && clearTimeout(handler);
          handler = setTimeout(function () {
            arguments.callee();
          }, 10000);
        }
      });
    } else {

    }
  };

  /******************************* 主体模块 ******************************/

  var main = {
    /*
     * @module 注册点击事件监听器
     * @params type 定义页面需要监听的事件类型
     * @params target 事件源
     * @params sign 元素ID Class
     * @params context 事件源文本
     * @params timeAxis 时间戳
     * */
    monitor: function () {
      console.log('----启动操作轨迹收集器----');
      var $this = this;
      $this.anchor = 0;
      window.addEventListener('tap', function (Event) {
        var DATA = {
          type: 'tap',
          target: Event.target.tagName || Event.target.nodeName,
          sign: {
            id: String(Event.target.id).trim(),
            class: String(Event.target.className).trim()
          },
          context: String(Event.target.innerText).trim() || String(Event.target.textContent).trim(),
          timeAxis: new Date().getTime()
        };
        if(DATA.timeAxis - $this.anchor > 500){
          $this.anchor = DATA.timeAxis;
          addData(config.FUN.MONITOR, DATA);
        }
      });
    },

    /*
     * @module 埋点 TODO 待开发
     * */
    buriedPoint: (function () {
      console.log('----启动埋点收集器----');
    }),

    /*
     * @module JS异常监听
     * */
    codeError: function () {
      console.log('----启动代码异常收集器----');
      window.onerror = function(){
        addData(config.FUN.CODEERROR,{
          timeAxis: new Date().getTime(),
          Msg: arguments[0],
          Url: arguments[1],
          Lin: arguments[2]
        });
      }
    },

    /*
     * @module 接口监听
     * @class interface $.ajax请求
     * */
    interface: function () {
      console.log('----启动接口收集器----');
      var ajaxBack = $.ajax,
        DATA = {};
      $.ajax = function (setting) {
        var start, end,
          suc = setting.success;//克隆success副本
        setting.beforeSend = function () {
          start = new Date().getSeconds();
        };
        setting.success = function () {
          end = new Date().getSeconds();
          if ($.isFunction(suc)) {
            DATA.address = setting.url;
            //接口H5入参
            DATA.frontLog = {
              data: setting.data ? setting.data : '',
              type: setting.type
            };
            //接口返回参数
            DATA.backLog = arguments[0];
            DATA.timeAxis = new Date().getTime();
            DATA.spend = end - start;
            DATA.errorFlag = arguments[0].flag == '1' ? 'N' : 'Y';
            addData(config.FUN.INTERFACE, DATA);
            //处理异常情况 触发数据上报
            if (arguments[0].flag != config.FLAG.SUCCESS) {
              submitData();
            }
            suc.apply(setting.success, arguments);
          }
        };
        ajaxBack(setting);//重新发起请求
      };
    }
  };

  /******************************* 启动模块 ******************************/

  /*
   * @isExist 检测配置信息
   * @startUp 启动程序
   * */
  var isExist = function () {
    return localStorage.getItem(config.FIELD.SWITCH) ? true : false;
  };
  var accountExist = function (h,l) {
    !h && l ? localStorage.setItem(config.FIELD.USERID,l) : '';
    return (h && l && h != l) ? true : false;
  };

  var startUp = function () {
    var duration = localStorage.getItem(config.FIELD.DURATION),
      history = localStorage.getItem(config.FIELD.USERID),
      login = localStorage.getItem(config.FIELD.LOGINFO);
    if(!isExist()){
      console.log('------start 配置信息不存在，重新请求配置信息！-----');
      updateSwitch(config.APP.UPCCODE);
      return;
    }
    if(!history){
      localStorage.setItem(config.FIELD.USERID,login);
    }
    if(history && login && history != login){
      console.log('------start 用户更换账号登录，提交采集数据并重建缓存！-----');
      submitData();
      localStorage.setItem(config.FIELD.USERID,login);
    }
    config.SWITCHSTATE = JSON.parse(localStorage.getItem(config.FIELD.SWITCH));
    if (config.SWITCHSTATE.switch == 'Y') {
      //开始创建数据
      createContainer();
      //根据开关配置执行相关模块
      for (name in config.SWITCHSTATE.config) {
        if (config.SWITCHSTATE.config[name] == 'Y') {
          (main[name] && main[name] instanceof Function) ? main[name]() : '';
        }
      }
      return;
    }
    if(!duration || (parseInt(duration) <= new Date().getTime())){
      console.log('------start 配置信息时长失效，重新请求配置信息！-----');
      updateSwitch(config.APP.UPCCODE);
      return;
    }
    console.log('系统开关已关闭！');
  };

  /******************************* 程序入口start ******************************/

  startUp();//根据配置信息执行相关功能模块

  /******************************* 程序入口end ******************************/
})();



