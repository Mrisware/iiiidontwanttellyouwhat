/**
 * Create by WangZQ 2019/9/20
 */
import React from 'react';
import {
    DeviceEventEmitter,
    Image,
    ImageBackground,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import CustomStyles from "../../styles/CustomStyles";
import System from "../../utils/System";
import Utils from "../../utils/Utils";
import Notices from "../../model/Notices";
import BaiduUtils from "../../utils/BaiduUtils";
import Fetch from "../../http/Fetch";
import LoginInfo from "../../model/LoginInfo";
import UpdateDialog from "../../dialog/UpdateDialog";
import OliDrumDialog from "../../dialog/OliDrumDialog";
import OliDrumFullDialog from "../../dialog/OliDrumFullDialog";
import ImageUtil from "../../utils/ImageUtil";
import Theme from "teaset/themes/Theme";
import TopSwiper from "./fragment/TopSwiper";
import {FormLayout} from "react-native-qiwei";
import Carousel from 'react-native-snap-carousel';
import ShopNearbyListComponent from "../shop/ShopNearbyListComponent";
import ShareDialog from "../../dialog/ShareDialog";
import WashComponent from "./secondary/WashComponent";
import EmptyDataView from "../../view/EmptyDataView";
import ShareExampleDialog from "../../dialog/ShareExampleDialog";
import PushCommonChooseDialog from "../../dialog/PushCommonChooseDialog";
import ConfirmNormalDialog from "../../dialog/ConfirmNormalDialog";
import HomeUtilsSwiper from "./HomeUtilsSwiper";
import {CachedImage} from "../../view/cache";
import NativeUtils from "../../utils/NativeUtils";
import HomeAdDialog1 from "../../dialog/HomeAdDialog1";
import SurePayDialog from "../../dialog/SurePayDialog";

export default class HomeNewComponent extends React.Component {

    constructor(props) {
        super(props);
        System.viewRoot = this;
        this.navigation = this.props.navigation;
        if (this.props.navigation.state.params !== undefined && this.props.navigation.state.params.toMine) {
            this.props.navigation.navigate('MyTabPage');
        }
        if (this.props.navigation.state.params !== undefined && this.props.navigation.state.params.toMember) {
            this.props.navigation.navigate('MemberTabPage');
        }
        if (this.props.navigation.state.params !== undefined && this.props.navigation.state.params.toOrder) {
            this.props.navigation.navigate('OrderComponent');
        }
        this.oilData = {};
        this.state = {
            isLoading: true,
            isNetError: false,
            general_wash_param: 'GENERAL_WASH',
            fine_wash_param: 'FINE_WASH',
            cityInfo: {
                cityName: System.LOCAL_CITY_INFO.cityName,
                cityCode: System.LOCAL_CITY_INFO.cityCode
            },
            topDataList: [],
            slider1ActiveSlide: 0,
            congratulationList: [

            ],//提现列表
        };
        this.getCurrentPosition();
    }

    getCurrentPosition = async () => {
        BaiduUtils.getCurrentPosition()
            .then((result) => {
                let city = result.city.indexOf("市") !== -1 ? result.city.split("市")[0]:result.city;
                if (!Utils.textIsEmpty(LoginInfo.login_log_id) && LoginInfo.login_log_id !== System.login_log_id) {
                    //如果当前登录的日志id与记录的日志id不相同  说明未记录过经纬度
                    this.saveLoginLocationInfo(result.longitude,result.latitude);
                }
                Utils.saveCityInfo(result.latitude,result.longitude,result.name,city,result.cityCode,result.province);
                this.setState({
                    cityInfo: {
                        cityName: city,
                        cityCode: result.cityCode
                    }
                });
                System.LOCAL_CITY_INFO = {
                    latitude: result.latitude, //当前经度
                    longitude: result.longitude, //当前纬度
                    curPosition: result.name, //当前地址名
                    cityName: city, //城市名称
                    cityCode: result.cityCode, //城市编码
                    province: result.province
                };
                DeviceEventEmitter.emit(Notices.GetPosition, {
                    place: result.name,
                    latitude: result.latitude,
                    longitude: result.longitude
                });
            })
            .catch((error) => {

            })
    };

    saveLoginLocationInfo = (longitude,latitude) => {
        //调用过后记录调用过的登录日志id
        System.login_log_id = LoginInfo.login_log_id;
        Fetch.postNoHint(
            100516,
            {
                login_log_id: LoginInfo.login_log_id,
                longitude: longitude,
                latitude: latitude,
            }
        )
    };

    checkAdDialog = () => {
        Fetch.postNoHint(105040, {code: 'activity_ad'}, (result) => {
            let activityData = result.data[0];
            if (System.update_type === '0') {
                let params = Utils.getParams(activityData.link_url);
                params.title = activityData.title;
                params.image_path = activityData.image_path;
                this.adDialog.showDialogWithInfo(params, this.renderToActivity);
                // HomeAdDialog.showDialog(params, this.renderToActivity);
            }
        });
    };

    renderToActivity = (info) => {
        if (info.url.indexOf("RN://") === 0) {
            //包含RN://说明跳转RN界面
            Utils.goToPage(info,this.props.navigation);
            return;
        }
        this.props.navigation.push("CommonWebView", {url: info.url, title: info.title});
    };

    async componentDidMount() {
        this.getUserState();
        //检测版本更新
        if (System.first) {
            let query = await NativeUtils.getWebIntent();
            if (!Utils.textIsEmpty(query)) {
                let theRequest = {};
                let paramsList = query.split("&");
                for(let i = 0; i < paramsList.length; i ++) {
                    theRequest[paramsList[i].split("=")[0]]=unescape(paramsList[i].split("=")[1]);
                }
                Utils.goToPage(theRequest,this.props.navigation);
            } else {
                //前往套餐页面
                if (System.is_shopkeeper === '0' || System.is_can_update === '1') {
                    Utils.goToMeal(this.props.navigation, System.FIRST_OPEN_APP, System.FIRST_OPEN_APP ? '新人首单福利' : System.MenuTitle);
                }

            }
            System.first = false;
            //查询用户是否有未支付订单
            this.getUnPayInfo();
            if (Utils.isLogin()) {
                //查询当前用户油桶信息
                Fetch.postNoHint(129560,
                    {},
                    (result) => {
                        let data = result.data[0];
                        System.OliDrumActivityId = data.cur_activity_id;
                        switch (data.client_partake_status) {
                            case 'nothing'://无油桶活动
                                break;
                            case 'launch'://可发起油桶活动
                                this.oliDrumDialog.showDialogWithImg(data.partake_image);

                                this.oilData.showOliDrumType = '0';
                                this.oilData.oliDrumImg = ImageUtil.GetOli;

                                this.setState({
                                    showOliDrumType: '0',
                                    oliDrumImg: ImageUtil.GetOli,
                                });
                                break;
                            case 'assisting'://正在发起(对应油量显示)
q
exit
;
q!
visual
                                let cur = data.client_partake_value;//当前油量
                                let total = data.capacity;//总油量
                                let per = cur /total;
                                let img;
                                if (per < 0.25) {
                                    img = ImageUtil.Oli20;
                                } else if (per < 0.5) {
                                    img = ImageUtil.Oli40;
                                } else if (per < 0.75) {
                                    img = ImageUtil.Oli60;
                                } else {
                                    img = ImageUtil.Oli80;
                                }

                                this.oilData.showOliDrumType = '1';
                                this.oilData.curOliDrum = cur;
                                this.oilData.oliDrumImg = img;
                                this.oilData.face_value = data.face_value;

                                this.setState({
                                    showOliDrumType: '1',
                                    curOliDrum: cur,
                                    oliDrumImg: img,
                                    face_value: data.face_value,
                                });
                                break;
                            case 'receive'://待兑换
                                this.oliDrumFullDialog.showDialogWithText(data.face_value);

                                this.oilData.showOliDrumType = '2';
                                this.oilData.oliDrumImg = ImageUtil.FullOli;

                                this.setState({
                                    showOliDrumType: '2',
                                    oliDrumImg: ImageUtil.FullOli,
                                });
                                break;
                        }
                    });
            } else {
                //查询是否有油桶活动
                Fetch.postNoHint(129068,
                    {},
                    (result) => {
                        let data = result.data[0];
                        if (data.is_hava_activity === '1') {
                            //有活动
                            this.oliDrumDialog.showDialogWithImg(data.partake_image);

                            this.oilData.showOliDrumType = '0';
                            this.oilData.oliDrumImg = ImageUtil.GetOli;

                            this.setState({
                                showOliDrumType: '0',
                                oliDrumImg: ImageUtil.GetOli,
                            });
                        }
                    })
            }
            if (System.update_type === '2') {
                //强制更新
                UpdateDialog.showForcedDialog();
            } else if (System.update_type === '1') {
                //推荐更新
                UpdateDialog.showNormalDialog();
            }

        }

        this.getHomeData();

        this.changeCity = DeviceEventEmitter.addListener(Notices.ChangeCity, () => {
            let cityInfo = this.state.cityInfo;
            cityInfo.cityName = System.CITY_INFO.cityName;
            cityInfo.cityCode = System.CITY_INFO.cityCode;
            this.setState({
                cityInfo: cityInfo
            });
            // this.getHomeData();
        });

        this.getPositionListener = DeviceEventEmitter.addListener(Notices.GetPosition, () => {
            this.getHomeData();
        });

        this.navigatorListener = DeviceEventEmitter.addListener('WebIntent', (data) => {
            let theRequest = {};
            let paramsList = data.split("&");
            for(let i = 0; i < paramsList.length; i ++) {
                theRequest[paramsList[i].split("=")[0]]=unescape(paramsList[i].split("=")[1]);
            }
            Utils.goToPage(theRequest,this.props.navigation);
        });
    }

    componentWillUnmount() {
        this.changeCity.remove();
        this.navigatorListener.remove();
        this.getPositionListener.remove();
    }

    //检查是否有未支付订单
    getUnPayInfo = () => {
        if (Utils.isLogin()) {
            Fetch.postNoHint(
                110551,
                {},
                (result) => {
                    let data = result.data[0];
                    if (!Utils.textIsEmpty(data.wait_pay_num)) {
                        this._showPayDialog(data.wait_pay_num);
                    } else {
                        this.checkAdDialog();
                    }
                }, () => this.checkAdDialog(), () => this.checkAdDialog()
            )
        } else {
            this.checkAdDialog();
        }
    };

    _showPayDialog = (order_no, status) => {
        //订单支付通知  需要弹出支付弹框
        Fetch.postNoHint(110542,
            {
                'order_no': order_no,
            },
            (result) => {
                let data = result.data[0];
                if (status === '1') {
                    this.payDialog.showDialogWithData(data);
                } else {
                    this.surePayDialog.showDialogWithData(data);
                }
            });
    };

    //获取首页数据
    getHomeData = () => {
        DeviceEventEmitter.emit(Notices.ShopListRefresh, true);
        Fetch.postWithNetFail(
            170014,
            {
                province_name: System.CITY_INFO.province,
                city_name: System.CITY_INFO.cityName,
            },
            (result) => {
                let data = result.data[0];
                this.setState({
                    uList: data.ulist,//工具列表
                    cList: data.clist,//一级列表
                    sList: data.slist,//新工具列表
                    ncList: data.nclist,//新工具列表顶部五项
                    topDataList: data.adlist,//广告列表
                    packwashlist: data.hotlist,//热销高返
                    cw_promote_info: data.cw_promote_info,//洗车促销信息
                    mt_promote_info: data.mt_promote_info,//加油促销信息
                    fo_promote_info: data.fo_promote_info,//保养促销信息
                    wa_promote_info: data.wa_promote_info,//打蜡促销信息
                    mr_promote_info: data.mr_promote_info,//美容促销信息
                    isLoading: false,
                    isNetError: false,
                    client_reward: data.client_reward,//奖励领取
                    income_invite_memeber: data.income_invite_memeber,//邀请好友奖励价格
                    income_top_reward: data.income_top_reward,//邀请购买商品奖励
                    income_promote_price: data.income_promote_price,//邀请好友洗车1元
                    congratulationList: data.cashlist,//提现列表
                });

            },() => this._netError(), () => this._netError()
        )
    };

    _netError = () => {
        this.setState({
            isNetError: true,
            isLoading: false,
        })
    };

    //是否购买过199
    getUserState = () => {
        Fetch.postNoHint(143512,
            {},
            (result) => {
                let data = result.data[0];
                System.is_shopkeeper = data.is_shopkeeper;
                System.is_can_update = data.is_can_update;
            });
    };

    render() {
        let statusBarColor = (Platform.OS === 'ios' || Platform.Version > 20) ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,1)';
        let cityName = this.state.cityInfo.cityName.length > 4 ?
            this.state.cityInfo.cityName.substring(0, 4) + "...": this.state.cityInfo.cityName;
        return (
            <View style={[CustomStyles.container,CustomStyles.backgroundColorWhite]}>
                <View style={[styles.topContainer,{height: 50 + Theme.statusBarHeight, paddingTop: 6 + Theme.statusBarHeight,}]}>
                    <View style={[{alignItems:'flex-end'},
                        CustomStyles.rowFlex
                    ]}>
                        <View style={[
                            CustomStyles.rowFlex,
                            CustomStyles.verticalCenter,
                            CustomStyles.horizontalCenter,
                            CustomStyles.container
                        ]}>
                            <TouchableWithoutFeedback onPress={() => {
                                this.props.navigation.navigate('LocationSelectScreen');
                            }}>
                                <View style={[CustomStyles.rowFlex, {alignItems: 'center'}]}>
                                    <Text style={[
                                        CustomStyles.fontSize14,
                                        CustomStyles.colorBlack
                                    ]}>{cityName}</Text>
                                    <Image style={{height: 9, width: 9,marginLeft: 10,resizeMode: 'contain'}} source={ImageUtil.IconDownBlack} />
                                </View>
                            </TouchableWithoutFeedback>
                            <TouchableWithoutFeedback
                                onPress={() => {
                                    this.navigation.navigate('ShopSearchScreen',{});
                                }}
                            >
                                <View style={[
                                    CustomStyles.container,CustomStyles.rowFlex,{backgroundColor: '#F2F2F2', justifyContent: 'center',
                                        alignItems: 'center', borderRadius: 2,marginLeft: 10, marginRight: 15,height: 28}
                                ]}>
                                    <Image source={ImageUtil.IconSearchBlack} style={{height: 15, width: 15}}/>
                                    <Text style={[CustomStyles.fontSize12,CustomStyles.colorGray,{marginLeft: 10}]}>搜索服务门店
                                    </Text>
                                </View>
                            </TouchableWithoutFeedback>

                            <TouchableWithoutFeedback onPress={() => {
                                if (Utils.isLogin()) {
                                    ShareDialog.showDialog(5);
                                } else {
                                    Utils.goLogin(this.props.navigation);
                                }
                            }}>
                                <Image style={[{height: 18, width: 18,resizeMode: 'contain'}]} source={ImageUtil.IconShareBlack} />
                            </TouchableWithoutFeedback>
                        </View>
                    </View>
                </View>
                <ScrollView
                            onScrollEndDrag={(e) => {
                                let offsetY = e.nativeEvent.contentOffset.y; //滑动距离
                                let contentSizeHeight = e.nativeEvent.contentSize.height; //scrollView contentSize高度
                                let oriageScrollHeight = e.nativeEvent.layoutMeasurement.height; //scrollView高度
                                if (offsetY + oriageScrollHeight + 1 >= contentSizeHeight){
                                    DeviceEventEmitter.emit(Notices.ShopListLoadMore,false);
                                }
                            }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={false}
                                    onRefresh={this.getHomeData}
                                />
                            }
                >
                    <StatusBar backgroundColor={statusBarColor} translucent={true} barStyle={'dark-content'} />
                    <OliDrumDialog navigation={this.props.navigation} ref={(v) => this.oliDrumDialog = v}/>
                    <OliDrumFullDialog navigation={this.props.navigation} ref={(v) => this.oliDrumFullDialog = v}/>
                    <ShareExampleDialog ref={(v) => this.shareExampleDialog = v}/>
                    <SurePayDialog ref={(v) => this.surePayDialog = v} navigation={this.navigation} canClose={false}/>
                    <PayDialog ref={(v) => this.payDialog = v} navigation={this.navigation} canClose={false}/>
                    <PushCommonChooseDialog ref={(v) => this.chooseDialog = v} classData={this.props.navigation} data={[{key: '违章查缴',value: 'PrepareListScreen'},{key: '罚单查询',value: 'TicketQueryScreen'}]} showCancel={true}/>
                    <HomeAdDialog1 ref={(v) => this.adDialog = v}/>

                    {this.state.isLoading ? Utils.renderLoadingView({height: System.SCREEN_HEIGHT}) : null}
                    {this.state.isNetError ? <EmptyDataView imgSource={ImageUtil.BgNetError} onPress={() => this.getHomeData()}/> : null}
                    {!this.state.isLoading && !this.state.isNetError ? this.renderPage() : null}

                </ScrollView>
                {this.renderOliDrum()}
            </View>

        );
    }

    renderPage = () => {
        return <View>
            {this.state.topDataList.length > 0 ? <View style={{
                width: '100%' - 30,
                height: (System.SCREEN_WIDTH - 30) * 0.41,
                alignItems: 'center',
                marginLeft: 15,
                marginRight: 15,
            }}>
                <TopSwiper
                    swiperData={this.state.topDataList}
                    _navigation={this.props.navigation}
                    itemHeight={(System.SCREEN_WIDTH - 30) * 0.41}
                    borderRadius={5}
                />
            </View> : null}

            {this._renderTopUtils()}

            {this._renderMeal()}
            <FormLayout
                name={'躺赚收入'}
                leftTextStyle={[CustomStyles.fontSize18,CustomStyles.colorBlack,CustomStyles.fontBold]}
                showRightImg={Utils.isLogin() && this.state.client_reward !== '0.00'}
                // && this.state.client_reward !== '0.00'
                rightView={Utils.isLogin() ? <View style={[CustomStyles.rowFlex,CustomStyles.verticalCenter]}>
                    <Text style={[CustomStyles.fontSize14,CustomStyles.colorGray]}>您有</Text>
                    <Text style={[CustomStyles.fontSize14,CustomStyles.colorMain]}>{this.state.client_reward}元</Text>
                    <Text style={[CustomStyles.fontSize14,CustomStyles.colorGray]}>奖励待领取</Text>
                    <Image source={ImageUtil.IconRightGray_} style={{marginLeft: 10,width:5,height:10}} />
                </View> : null}
                rightTextStyle={[CustomStyles.fontSize14,CustomStyles.colorGray]}
                containerStyle={{paddingRight: 15, paddingLeft: 15}}
                onPress={() => {
                    if (Utils.isLogin()) {
                        if (Utils.isGoLogin(this.navigation)) {
                            this.navigation.navigate('RewardComponentScreen');
                        }
                    }
                }}
            />

            <View style={[CustomStyles.rowFlex,CustomStyles.paddingHorizontal,{width: '100%'}]}>
                <TouchableWithoutFeedback onPress={() => {
                    if (Utils.isGoLogin(this.navigation)) {
                        if (Utils.getUserType() !== '会员') {
                            ShareDialog.showDialog(4);
                        } else {
                            ConfirmNormalDialog.showDialogWithInfo('', '您当前身份为会员，暂无该功能权限，请成为店主再来分享', (params) => {
                                Utils.goToMeal(this.navigation);
                                params.closeDialog();
                            },'成为店主','再看看');
                        }
                    }
                }}>
                    <View style={styles.itemShareView}>
                        <ImageBackground source={ImageUtil.IconHomeShareMeal} style={styles.itemShare}>
                            <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack,CustomStyles.fontBold]}>邀好友购套餐</Text>
                            <View style={[CustomStyles.rowFlex,{marginBottom: 10}]}>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorGray]}>立赚</Text>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorMain]}>{this.state.income_invite_memeber}</Text>
                            </View>
                        </ImageBackground>
                    </View>
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback onPress={() => {
                    if (Utils.isGoLogin(this.navigation)) {
                        this.shareExampleDialog.showDialog(true);
                    }
                }}>
                    <View style={[styles.itemShareView,{marginLeft: '2.7%',marginRight: '2.7%'}]}>
                        <ImageBackground source={ImageUtil.IconHomeShareShop} style={[styles.itemShare,]}>
                            <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack,CustomStyles.fontBold]}>邀好友购商品</Text>
                            <View style={[CustomStyles.rowFlex,{marginBottom: 10}]}>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorGray]}>最高可赚</Text>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorMain]}>{this.state.income_top_reward}</Text>
                            </View>
                        </ImageBackground>
                    </View>
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback onPress={() => {
                    if (Utils.isGoLogin(this.navigation)) {
                        if (Utils.getUserType() !== '会员') {
                            ShareDialog.showDialog(7);
                        } else {
                            ConfirmNormalDialog.showDialogWithInfo('', '您当前身份为会员，暂无该功能权限，请成为店主再来分享', (params) => {
                                Utils.goToMeal(this.navigation);
                                params.closeDialog();
                            },'成为店主','再看看');
                        }
                    }
                }}>
                    <View style={styles.itemShareView}>
                        <ImageBackground source={ImageUtil.IconHomeShareWash} style={styles.itemShare}>
                            <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack,CustomStyles.fontBold]}>送好友1元洗车</Text>
                            <View style={[CustomStyles.rowFlex,{marginBottom: 10}]}>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorGray]}>支付</Text>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorMain]}>{this.state.income_promote_price}</Text>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorGray]}>即可洗车</Text>
                            </View>
                        </ImageBackground>
                    </View>
                </TouchableWithoutFeedback>
            </View>

            {this.state.congratulationList.length > 0 ? <View style={{width: '100%', height: 20,marginTop: 15}}>
                <Carousel
                    data={this.state.congratulationList}
                    renderItem={this._renderSwiper}
                    itemHeight={20000}
                    sliderHeight={20}
                    itemWidth={System.SCREEN_WIDTH - 30}
                    sliderWidth={System.SCREEN_WIDTH - 30}
                    autoplay={true}
                    loop={true}
                    vertical={true}
                    autoplayInterval={5000}
                    scrollEnabled={false}
                />
            </View> : null}


            <View style={[styles.divide,{marginTop: 15}]}/>

            <ShopNearbyListComponent navigation={this.props.navigation}
                                     showMap={true}
                                     showSearch={false}
                                     style={{marginTop: 12}}
                                     isScrollView={true}
                                     showBrands={true}
                                     />
        </View>
    };

    _renderTopUtils = () => {
        let views = [];
        if (this.state.cityInfo.cityName === '杭州') {
            //定位为杭州时显示新布局
            views.push(
                <View style={[CustomStyles.paddingHorizontal,CustomStyles.rowFlex,{width: '100%',marginTop: 20}]}>
                    {this._renderFirstItem()}
                </View>
            );
            if (this.state.sList && this.state.sList.length !== 0) {
                views.push(
                    <View style={{
                        width: '100%' - 30,
                        alignItems: 'center',
                        marginLeft: 15,
                        marginRight: 15,
                        height: (0.081 * (System.SCREEN_WIDTH - 30)) + 40,
                    }}>
                        <HomeUtilsSwiper
                            swiperData={this.state.sList}
                            _navigation={this.props.navigation}
                            borderRadius={3}
                        />
                    </View>
                )
            }
            views.push(
                <View style={[styles.divide]}/>
            )
        } else {
            //不是杭州则显示老布局
            views.push(
                <FormLayout
                    name={'爱车养护'}
                    leftTextStyle={[CustomStyles.fontSize18,CustomStyles.colorBlack,CustomStyles.fontBold]}
                    // showRightImg={true}
                    rightText={'全国30000+门店提供服务'}
                    rightTextStyle={[CustomStyles.fontSize14,CustomStyles.colorGray]}
                    rightImgStyle={{marginLeft: 10}}
                    rightImgSource={ImageUtil.IconRightGray_}
                    containerStyle={{paddingRight: 15, paddingLeft: 15}}
                />
            );
            views.push(
                <View style={[CustomStyles.rowFlex,CustomStyles.paddingHorizontal,{width: '100%'}]}>
                    <TouchableWithoutFeedback onPress={() => {
                        this.navigation.navigate('WashComponent');
                    }}>
                        <View style={styles.itemMainView}>
                            <ImageBackground source={ImageUtil.IconHomeWash} style={styles.itemMain} resizeMode={'stretch'}>
                                <Text style={[CustomStyles.fontSize14,CustomStyles.colorWhite]}>洗车</Text>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorWhite]}>{this.state.cw_promote_info}</Text>
                            </ImageBackground>
                        </View>
                    </TouchableWithoutFeedback>

                    <TouchableWithoutFeedback onPress={() => {
                        this.navigation.navigate('GasRechargeScreen',{'product_no': 'FO-100005-01'});
                    }}>
                        <View style={[styles.itemMainView,{marginLeft: '2.7%',marginRight: '2.7%'}]}>
                            <ImageBackground source={ImageUtil.IconHomeOli} style={[styles.itemMain,]} resizeMode={'stretch'}>
                                <Text style={[CustomStyles.fontSize14,CustomStyles.colorWhite]}>加油</Text>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorWhite]}>{this.state.mt_promote_info}</Text>
                            </ImageBackground>
                        </View>
                    </TouchableWithoutFeedback>

                    <TouchableWithoutFeedback onPress={() => {
                        this.navigation.navigate('BeautyScreen');
                    }}>
                        <View style={styles.itemMainView}>
                            <ImageBackground source={ImageUtil.IconHomeWax} style={styles.itemMain} resizeMode={'stretch'}>
                                <Text style={[CustomStyles.fontSize14,CustomStyles.colorWhite]}>美容</Text>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorWhite]}>{this.state.mr_promote_info}</Text>
                            </ImageBackground>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            );
            views.push(
                <View style={[CustomStyles.rowFlex,CustomStyles.paddingHorizontal,{width: '100%',marginTop: 12}]}>
                    {this._renderUtils()}
                </View>
            );
            views.push(
                <View style={[styles.divide,{marginTop: 15}]}/>
            )
        }
        return views;
    };

    _renderFirstItem = () => {
        let views = [];
        for (let i = 0; i < this.state.ncList.length; i++) {
            let width = 0.138 * (System.SCREEN_WIDTH - 30);
            // let imgHeight = 0.168 * (System.SCREEN_WIDTH - 30);
            let item = this.state.ncList[i];
            views.push(
                <TouchableWithoutFeedback onPress={() => {
                    Utils.goToCarService(item,this.navigation,this.chooseDialog);
                }}>
                    <View style={[{flex: 1, marginBottom: 15,justifyContent: 'center', alignItems: 'center'}]}>
                        <CachedImage source={{uri: item.pic}} style={[{width: width, height: width, resizeMode: 'stretch', marginBottom: 10}]} />
                        <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack]}>{item.name}</Text>
                    </View>
                </TouchableWithoutFeedback>
            )
        }
        return views;
    };

    _renderUtils = () => {
        let views = [];
        for (let i = 0; i < this.state.uList.length; i++) {
            let item = this.state.uList[i];
            views.push(
                <TouchableWithoutFeedback onPress={() => {
                    Utils.goToCarService(item,this.navigation,this.chooseDialog);
                }}>
                    <View style={styles.itemService}>
                        <CachedImage style={styles.iconService} source={{uri: item.pic}}/>
                        <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack]}>{item.name}</Text>
                        {item.num && item.num !== '0' ?
                            <View style={[{width: 15, height: 15, borderRadius: 8,backgroundColor: System.ColorMain, position: 'absolute',top: 0 ,right: 15,justifyContent: 'center',alignItems: 'center'}]}>
                                <Text style={[CustomStyles.fontSize10,CustomStyles.colorWhite]}>{item.num}</Text>
                            </View>
                            : null}
                    </View>
                </TouchableWithoutFeedback>
            )
        }
        return views;
    };

    _renderSwiper = (data) => {
        let item = data.item;
        return <View style={[CustomStyles.rowFlex,{alignItems: 'center', paddingLeft: 15}]}>
            <Image source={ImageUtil.IconHomeCongratulation} style={{width: 40,height: 18,marginRight: 8}}/>
            <Text style={[CustomStyles.fontSize12,CustomStyles.colorGray]}>店主</Text>
            <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack,{maxWidth: 40}]} numberOfLines={1}>{item.bank_account_name}</Text>
            <Text style={[CustomStyles.fontSize12,CustomStyles.colorGray]}>成功提现</Text>
            <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack]}>{item.occur_amount}元</Text>
            <Text style={[CustomStyles.fontSize12,CustomStyles.colorGray]}>，累计获得收入</Text>
            <Text style={[CustomStyles.fontSize12,CustomStyles.colorBlack]}>{item.total_cash_amount}元</Text>
        </View>
    };

    _renderMeal = () => {
        let views = [];
        if (this.state.packwashlist.length !== 0) {
            views.push(<FormLayout
                    name={'热销高返'}
                    leftTextStyle={[CustomStyles.fontSize18,CustomStyles.colorBlack,CustomStyles.fontBold]}
                    showRightImg={true}
                    rightText={'查看更多'}
                    rightTextStyle={[CustomStyles.fontSize14,CustomStyles.colorGray]}
                    rightImgStyle={{marginLeft: 10}}
                    rightImgSource={ImageUtil.IconRightGray_}
                    containerStyle={{paddingBottom: 0, paddingRight: 15, paddingLeft: 15}}
                    onPress={() => {
                        this.navigation.navigate('WashMealMoreScreen');
                    }}
                />
            );
        }
        views.push(
            <View style={[CustomStyles.rowFlex,{marginLeft:15, width:System.SCREEN_WIDTH - 30}]}>
                {
                   this._renderMealInner()
                }
            </View>
        );

        if (this.state.packwashlist.length !== 0) {
            views.push(<View style={[styles.divide,{marginTop: 15}]}/>)
        }
        return views;
    };

    _renderMealInner = () => {

        let views = [];
        for (let i = 0; i < this.state.packwashlist.length; i++) {
            let data = this.state.packwashlist[i];
            let imageW = (System.SCREEN_WIDTH - 60) / this.state.packwashlist.length;
            let marginLeft = i === 0 ? 0 : 15;

            views.push(<TouchableWithoutFeedback onPress={() => {
                // this.navigation.navigate('NotarizeOrderScreen', {product_no: data.product_no});
                this.navigation.navigate("GoodDetailPage", {product_no: data.product_no, type: 0});
            }}>
                {/*style={[CustomStyles.rowFlex,CustomStyles.paddingHorizontal,{marginTop: 15}]*/}
                <View style={[CustomStyles.container,{marginTop: 15, marginLeft: marginLeft}]}>
                    <CachedImage source={{uri: data.product_image}} style={{width: imageW, height: imageW, borderWidth: 1, borderColor: '#f2f2f2', borderRadius: 2}}/>
                    <View style={[{position: 'absolute', top: imageW - 21,left:1,width:80,height:20}]}>
                        <Image source={ImageUtil.ImgHighPrice}/>
                        <View style={[CustomStyles.rowFlex,
                            CustomStyles.container,
                            CustomStyles.center,
                            {position: 'absolute', marginLeft:0, width:40, height:20}]}>
                            <Text style={[CustomStyles.colorWhite,{fontSize:7}]}>¥</Text>
                            <Text style={[CustomStyles.fontSize12,CustomStyles.colorWhite]}>{data.sell_price}</Text>
                        </View>
                        <View style={[CustomStyles.container,CustomStyles.center,
                            {position: 'absolute',marginLeft:40, width:40,height:20}]}>
                            <Text style={[CustomStyles.fontSize10,CustomStyles.colorWhite,{textDecorationLine:'line-through',textDecorationStyle:'solid'}]}>¥{data.market_price}</Text>
                        </View>
                    </View>
                    <Text style={[CustomStyles.fontSize14,CustomStyles.colorBlack, CustomStyles.container,{marginTop:10}]}
                          numberOfLines={1}>{data.product_name}</Text>
                    <Text style={[CustomStyles.fontSize10,CustomStyles.colorGray,{marginTop: 7}]} numberOfLines={1}>{data.product_label}</Text>

                </View>
            </TouchableWithoutFeedback>)
        }
        return views;
    };

    renderOliDrum = () => {
        if (Utils.textIsEmpty(this.oilData.showOliDrumType)) {
            return null;
        } else if (this.oilData.showOliDrumType === '1') {
            return  <View style={{width: 47, height: 56,position: 'absolute', right: 12, bottom: 30}}>
                <TouchableWithoutFeedback onPress={() => {
                    Utils.goToOliDrum(this.props.navigation);
                }}>
                    <View>
                        <ImageBackground source={this.oilData.oliDrumImg} style={{justifyContent: 'center', alignItems: 'center',width: 47, height: 56}}
                                         resizeMode={'contain'}>
                            <Text style={[{fontSize: 10, color: '#ffe2ba', marginTop: 10},CustomStyles.fontBold]}>{this.oilData.face_value}元</Text>
                        </ImageBackground>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        } else {
            return  <View style={{width: 58, height: 66,position: 'absolute', right: 12, bottom: 30}}>
                <TouchableWithoutFeedback onPress={() => {
                    Utils.goToOliDrum(this.props.navigation);
                }}>
                    <View>
                        <ImageBackground source={this.oilData.oliDrumImg} style={{justifyContent: 'center', alignItems: 'center',width: 58, height: 66}}
                                         resizeMode={'contain'}>
                        </ImageBackground>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        }
    }
}

const styles = StyleSheet.create({
    topContainer: {
        height: 50 + Theme.statusBarHeight,
        paddingLeft: 15,
        paddingRight: 15,
        paddingTop: 6 + Theme.statusBarHeight,
    },
    itemMainView: {
        width: '31.7%',
        height: 62 * 0.317 * System.SCREEN_WIDTH / 110,
    },
    itemMain: {
        paddingLeft: 11,
        paddingRight: 1,
        paddingBottom: 6,
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    itemShareView: {
        width: '31.7%',
        height: 99 * 0.317 * System.SCREEN_WIDTH / 108,
    },
    itemShare: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
    },
    itemService: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    iconService: {
        width: 28,
        height: 28,
        resizeMode: 'stretch',
        marginBottom: 8,
    },
    divide: {
        backgroundColor: '#F2F2F2',
        width: '100%',
        height: 10,
    },
    testing: {
      fontSize: 14
    }
});
