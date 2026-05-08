import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "zh";

const LANGUAGE_STORAGE_KEY = "museum-art-language";

const messages = {
  en: {
    "common.brand": "Eastwood Auction",
    "nav.visit": "Visit",
    "nav.exhibitions": "Exhibitions",
    "nav.collections": "Collections",
    "nav.imageSearch": "Image Search",
    "nav.support": "Support",
    "nav.search": "Search",
    "nav.donate": "Donate",
    "nav.openMenu": "Open menu navigation",
    "top.openToday": "OPEN TODAY AT 12 P.M.",
    "top.announcementMuseum": "Announcements from Museum",
    "top.announcementTickets": "Tickets available for 2023 auction event",
    "top.announcementCovid": "Our COVID-19 Policy",
    "top.joinGive": "Join & Give",
    "top.shop": "Museum Shop",
    "search.title": "Search",
    "search.imageTitle": "Search by image",
    "search.imageDescription":
      "Upload a photo to find visually similar collection items.",
    "search.openImageSearch": "Open image search",
    "search.events": "Search Events",
    "search.placeholder": "what are you looking for?",
    "search.submit": "Search",
    "search.ongoing": "Ongoing",
    "image.badge": "Image Search",
    "image.title": "Search the collection by image",
    "image.description":
      "Administrators can import photos into the local knowledge base. Visitors can upload a reference image to match against everything already indexed.",
    "image.userMode": "User image match",
    "image.adminMode": "Admin import",
    "image.referenceTitle": "Reference image",
    "image.uploadHelp": "JPG, PNG, or WebP works best.",
    "image.upload": "Upload",
    "image.errorTitle": "Image search failed",
    "image.emptyTitle": "Upload an artwork or object photo",
    "image.emptyDescription": "Results appear immediately after local analysis.",
    "image.localMatching":
      "Matching runs locally in the browser for this first version.",
    "image.dominantSignal": "Dominant signal",
    "image.reset": "Reset",
    "image.trySample": "Try a sample",
    "image.analysis": "Image analysis",
    "image.analysisEmpty":
      "Upload an image to see the visual signals used for matching.",
    "image.matches": "Closest matches",
    "image.indexed": "indexed",
    "image.ranked": "ranked",
    "image.bestMatch": "Best match",
    "image.similarity": "Similarity",
    "image.waiting": "Waiting",
    "image.rank": "Rank",
    "image.adminTitle": "Import to knowledge base",
    "image.adminDescription":
      "Add website-owned photos for future visitor matching.",
    "image.uploadAsset": "Upload asset",
    "image.importFailed": "Import failed",
    "image.adminEmptyTitle": "Upload a website collection photo",
    "image.adminEmptyDescription":
      "This becomes searchable by visitor image matching.",
    "image.fieldTitle": "Title",
    "image.fieldCategory": "Category",
    "image.fieldPeriod": "Period",
    "image.fieldVectors": "Indexed vectors",
    "image.fieldDescription": "Description",
    "image.placeholderTitle": "Artwork title",
    "image.placeholderCategory": "Jade, porcelain, painting...",
    "image.placeholderPeriod": "Dynasty, era, or year",
    "image.placeholderDescription": "Short collection note",
    "image.clearImported": "Clear imported photos",
    "image.importButton": "Import into knowledge base",
    "image.knowledgeBase": "Knowledge base",
    "image.searchablePhotos": "searchable photos",
    "image.currentIndex": "Current index",
    "image.adminImported": "admin-imported photos plus seeded collection examples.",
    "image.imported": "Imported",
    "image.loginTitle": "Admin login",
    "image.loginDescription":
      "Only authorized administrators can import collection photos into the knowledge base.",
    "image.loginFailed": "Login failed",
    "image.loginError": "Incorrect admin password.",
    "image.password": "Password",
    "image.passwordPlaceholder": "Enter admin password",
    "image.loginButton": "Log in to import",
    "image.demoPassword": "Demo password: admin123",
    "image.adminProtectedTitle": "Protected import workflow",
    "image.adminProtectedDescription":
      "Visitor image matching stays public, but knowledge-base import is restricted to administrators.",
    "image.logout": "Log out",
    "visit.heroTitle": "Plan your visit",
    "visit.heroDescription":
      "For the latest updates about reopening, booking tickets and what's happening at the Museum, sign up to our newsletter",
    "visit.bookNow": "Book Now",
    "visit.hoursTitle": "Museum Hours",
    "visit.hoursTue": "Tuesday, Wednesday, Friday-Sunday: 11 a.m.-5 p.m.; last entry is at 4 p.m.",
    "visit.hoursThu": "Thursday: 12 p.m.-8 p.m.; last entry is at 7 p.m.",
    "visit.hoursClosed":
      "Closed Monday and in observance of Juneteenth, Fourth of July, Indigenous People's Day, Election Day, Thanksgiving, Christmas, and New Year's Day.",
    "visit.ticketingTitle": "Advance Timed Ticketing",
    "visit.ticketingRecommended": "Timed, advance tickets are recommended.",
    "visit.ticketingHours":
      "Entrance times are on the hour, every hour, starting at 11 a.m. until 4 p.m.",
    "visit.ticketingAdmission":
      "Admission is accepted up to 30 minutes after your ticket time.",
    "visit.ticketingReleased": "Tickets are released four weeks in advance.",
    "visit.beforeTitle": "Before You Arrive",
    "visit.beforeTicket":
      "Please print your ticket or download it to your mobile device.",
    "visit.beforeMasks":
      "Masks are strongly recommended, except for children two and younger.",
    "visit.beforeSymptoms":
      "Visitors are required to check themselves for COVID-19 symptoms before entry. Anyone feeling sick should stay home and contact Visitor Services to reschedule.",
    "visit.arriveTitle": "When You Arrive",
    "visit.arriveScan": "Scan your ticket at self-scanning stations.",
    "visit.arriveMasks":
      "Masks are strongly recommended, except for children ages two and younger.",
    "visit.arriveSick":
      "Visitors who are feeling sick or experiencing COVID-19 symptoms will not be allowed to enter the museum.",
    "visit.policiesTitle": "Visitor Policies",
    "visit.policyMasks":
      "Masks are strongly recommended, except for children ages two and younger.",
    "visit.policyFood": "No food or drinks permitted in the museum.",
    "visit.policyLockers":
      "A limited number of self-serve storage lockers are available on a first-come basis. Valid ID is required.",
    "visit.policyBags": "Large bags are not permitted.",
    "visit.policyAnimals": "Only service animals are allowed.",
    "visit.healthNote":
      "Protecting the health and well-being of our staff and visitors is our top priority. We strongly recommend all staff and visitors wear a face mask and maintain distance from anyone outside their household.",
    "visit.infoNote":
      "See below for admission pricing and directions. For more information please contact Visitor Services at museumservices@email.org or call 000.00.0000.",
    "visit.galleryNote":
      "Occasionally we may need to close galleries at short notice. We regret that we are not always able to alert visitors in advance.",
    "visit.welcomeNote": "We look forward to welcoming you.",
    "visit.getTickets": "Get Tickets",
    "visit.exploreTitle": "Ways to explore",
    "visit.galleriesTitle": "Galleries",
    "visit.familyTitle": "Family visits",
    "visit.eventsTitle": "Exhibitions and Events",
    "visit.featureDescription":
      "Explore collection highlights, public programs, and gallery experiences designed for visitors of all ages.",
    "visit.accessibilityTitle": "Accessibility",
    "visit.accessibilityOne":
      "We have a wide range of services for disabled visitors.",
    "visit.accessibilityTwo":
      "Find out how to make the most of your visit and plan your trip in advance on our Accessibility at the Museum page.",
    "visit.learnMore": "Learn more",
    "visit.facilitiesTitle": "Facilities",
    "visit.foodTitle": "Food and drink",
    "visit.shopTitle": "Museum shop",
    "visit.collectionsTitle": "Collections",
    "visit.facilityDescription":
      "Visitor facilities are available throughout the museum to make your trip comfortable and convenient.",
    "faq.title": "Frequently Asked Questions",
    "faq.placeholder":
      "Our visitor services team can help with current details, accessibility needs, and planning questions before your visit.",
    "faq.openingHours": "What are our opening hours?",
    "faq.duration": "How long does it take to look around?",
    "faq.guides": "Are there printed or audio guides?",
    "faq.talks": "Do you give talks?",
    "faq.shop": "Is there a shop or cafe?",
    "faq.luggage": "Do you have anywhere to store our luggage?",
    "faq.access": "How accessible is the museum?",
    "faq.family": "Is the museum suitable for families?",
    "exhibitions.heroTitle": "Film Screening: When the time comes",
    "exhibitions.heroDate": "Saturday, April 15, 2023",
    "exhibitions.rsvp": "RSVP Now",
    "collections.heroTitle": "Explore the collection",
    "collections.heroDescription":
      "Welcome to Collection online. Find highlights, ongoing improvements, and helpful collection information.",
    "collections.searchPlaceholder": "Enter a keyword, person, place",
    "support.heroTitle": "Support us",
    "donation.heroTitle": "Donation",
    "home.heroTitle": "Welcome to Eastwood Auction",
    "home.heroDescription":
      "Discover exhibitions, collections, events, and visitor experiences from our museum and art community.",
    "home.learnMore": "Learn More",
    "home.playVideo": "Play background video",
    "home.pauseVideo": "Pause background video",
  },
  zh: {
    "common.brand": "Eastwood Auction",
    "nav.visit": "参观",
    "nav.exhibitions": "展览",
    "nav.collections": "收藏",
    "nav.imageSearch": "图片搜索",
    "nav.support": "支持",
    "nav.search": "搜索",
    "nav.donate": "捐赠",
    "nav.openMenu": "打开导航菜单",
    "top.openToday": "今日中午 12 点开放",
    "top.announcementMuseum": "博物馆公告",
    "top.announcementTickets": "2023 拍卖活动门票开放",
    "top.announcementCovid": "我们的 COVID-19 政策",
    "top.joinGive": "加入与捐赠",
    "top.shop": "博物馆商店",
    "search.title": "搜索",
    "search.imageTitle": "图片搜索",
    "search.imageDescription": "上传照片，查找视觉相似的馆藏项目。",
    "search.openImageSearch": "打开图片搜索",
    "search.events": "搜索活动",
    "search.placeholder": "你想找什么？",
    "search.submit": "搜索",
    "search.ongoing": "进行中",
    "image.badge": "图片搜索",
    "image.title": "通过图片搜索馆藏",
    "image.description":
      "管理员可以把网站照片导入本地知识库。用户可以上传参考图片，与已索引内容进行匹配。",
    "image.userMode": "用户图片匹配",
    "image.adminMode": "管理端导入",
    "image.referenceTitle": "参考图片",
    "image.uploadHelp": "支持 JPG、PNG 或 WebP。",
    "image.upload": "上传",
    "image.errorTitle": "图片搜索失败",
    "image.emptyTitle": "上传艺术品或物品照片",
    "image.emptyDescription": "本地分析完成后会立即显示结果。",
    "image.localMatching": "当前版本在浏览器本地完成匹配。",
    "image.dominantSignal": "主要特征",
    "image.reset": "重置",
    "image.trySample": "试用示例",
    "image.analysis": "图片分析",
    "image.analysisEmpty": "上传图片后可查看用于匹配的视觉特征。",
    "image.matches": "最接近的匹配",
    "image.indexed": "已索引",
    "image.ranked": "已排序",
    "image.bestMatch": "最佳匹配",
    "image.similarity": "相似度",
    "image.waiting": "等待中",
    "image.rank": "排名",
    "image.adminTitle": "导入到知识库",
    "image.adminDescription": "添加网站自有照片，供后续用户匹配使用。",
    "image.uploadAsset": "上传素材",
    "image.importFailed": "导入失败",
    "image.adminEmptyTitle": "上传网站馆藏照片",
    "image.adminEmptyDescription": "该照片会成为用户图片匹配的搜索目标。",
    "image.fieldTitle": "标题",
    "image.fieldCategory": "类别",
    "image.fieldPeriod": "年代",
    "image.fieldVectors": "已索引向量",
    "image.fieldDescription": "描述",
    "image.placeholderTitle": "艺术品标题",
    "image.placeholderCategory": "翡翠、瓷器、绘画...",
    "image.placeholderPeriod": "朝代、时期或年份",
    "image.placeholderDescription": "简短馆藏说明",
    "image.clearImported": "清空导入照片",
    "image.importButton": "导入知识库",
    "image.knowledgeBase": "知识库",
    "image.searchablePhotos": "张可搜索照片",
    "image.currentIndex": "当前索引",
    "image.adminImported": "张管理端导入照片，加上内置示例馆藏。",
    "image.imported": "已导入",
    "image.loginTitle": "管理员登录",
    "image.loginDescription": "只有授权管理员可以把馆藏照片导入知识库。",
    "image.loginFailed": "登录失败",
    "image.loginError": "管理员密码不正确。",
    "image.password": "密码",
    "image.passwordPlaceholder": "请输入管理员密码",
    "image.loginButton": "登录后导入",
    "image.demoPassword": "演示密码：admin123",
    "image.adminProtectedTitle": "受保护的导入流程",
    "image.adminProtectedDescription":
      "用户图片匹配保持公开，但知识库导入只允许管理员使用。",
    "image.logout": "退出登录",
    "visit.heroTitle": "计划你的参观",
    "visit.heroDescription":
      "了解重新开放、订票以及博物馆最新活动信息，请订阅我们的通讯。",
    "visit.bookNow": "立即预约",
    "visit.hoursTitle": "博物馆开放时间",
    "visit.hoursTue": "周二、周三、周五至周日：上午 11 点至下午 5 点；最后入场时间为下午 4 点。",
    "visit.hoursThu": "周四：中午 12 点至晚上 8 点；最后入场时间为晚上 7 点。",
    "visit.hoursClosed":
      "周一闭馆；六月节、美国独立日、原住民日、选举日、感恩节、圣诞节和元旦等节假日闭馆。",
    "visit.ticketingTitle": "预约分时门票",
    "visit.ticketingRecommended": "建议提前预约分时门票。",
    "visit.ticketingHours":
      "入场时间按整点开放，从上午 11 点开始至下午 4 点。",
    "visit.ticketingAdmission": "可在票面时间后 30 分钟内入场。",
    "visit.ticketingReleased": "门票会提前四周开放预约。",
    "visit.beforeTitle": "到达前须知",
    "visit.beforeTicket": "请打印门票，或将门票下载到手机设备。",
    "visit.beforeMasks": "强烈建议佩戴口罩，两岁及以下儿童除外。",
    "visit.beforeSymptoms":
      "入馆前请自行检查是否有 COVID-19 相关症状。如感到不适，请留在家中并联系访客服务重新预约。",
    "visit.arriveTitle": "到达后",
    "visit.arriveScan": "请在自助扫码点扫描门票。",
    "visit.arriveMasks": "强烈建议佩戴口罩，两岁及以下儿童除外。",
    "visit.arriveSick":
      "如访客感到不适或出现 COVID-19 相关症状，将不能进入博物馆。",
    "visit.policiesTitle": "访客政策",
    "visit.policyMasks": "强烈建议佩戴口罩，两岁及以下儿童除外。",
    "visit.policyFood": "馆内禁止携带食物和饮料。",
    "visit.policyLockers":
      "馆内提供数量有限的自助储物柜，先到先得，使用时需出示有效证件。",
    "visit.policyBags": "不允许携带大型包袋入馆。",
    "visit.policyAnimals": "仅允许服务动物入馆。",
    "visit.healthNote":
      "保护员工和访客的健康安全是我们的首要任务。我们强烈建议所有员工和访客佩戴口罩，并与非同住人员保持距离。",
    "visit.infoNote":
      "门票价格和交通信息请见下方。如需更多信息，请联系访客服务 museumservices@email.org 或拨打 000.00.0000。",
    "visit.galleryNote":
      "部分展厅可能会临时关闭。若无法提前通知到访客，我们深表歉意。",
    "visit.welcomeNote": "期待你的到来。",
    "visit.getTickets": "获取门票",
    "visit.exploreTitle": "探索方式",
    "visit.galleriesTitle": "展厅",
    "visit.familyTitle": "家庭参观",
    "visit.eventsTitle": "展览与活动",
    "visit.featureDescription":
      "探索馆藏亮点、公共项目，以及适合各年龄段访客的展厅体验。",
    "visit.accessibilityTitle": "无障碍服务",
    "visit.accessibilityOne": "我们为残障访客提供多种服务。",
    "visit.accessibilityTwo":
      "你可以在博物馆无障碍页面了解如何更好地规划行程。",
    "visit.learnMore": "了解更多",
    "visit.facilitiesTitle": "设施服务",
    "visit.foodTitle": "餐饮",
    "visit.shopTitle": "博物馆商店",
    "visit.collectionsTitle": "馆藏",
    "visit.facilityDescription":
      "博物馆内提供多种访客设施，让你的参观更加舒适便利。",
    "faq.title": "常见问题",
    "faq.placeholder":
      "访客服务团队可以帮助你了解开放信息、无障碍需求和参观规划问题。",
    "faq.openingHours": "开放时间是什么？",
    "faq.duration": "参观通常需要多长时间？",
    "faq.guides": "是否提供纸质或语音导览？",
    "faq.talks": "是否有讲解活动？",
    "faq.shop": "馆内有商店或咖啡厅吗？",
    "faq.luggage": "是否有地方寄存行李？",
    "faq.access": "博物馆无障碍程度如何？",
    "faq.family": "博物馆适合家庭参观吗？",
    "exhibitions.heroTitle": "影片放映：当时机到来",
    "exhibitions.heroDate": "2023 年 4 月 15 日，星期六",
    "exhibitions.rsvp": "立即预约",
    "collections.heroTitle": "探索馆藏",
    "collections.heroDescription":
      "欢迎访问线上馆藏。你可以查找馆藏亮点、最新改进和实用馆藏信息。",
    "collections.searchPlaceholder": "输入关键词、人物或地点",
    "support.heroTitle": "支持我们",
    "donation.heroTitle": "捐赠",
    "home.heroTitle": "欢迎来到 Eastwood Auction",
    "home.heroDescription":
      "探索展览、馆藏、活动，以及来自博物馆与艺术社区的参观体验。",
    "home.learnMore": "了解更多",
    "home.playVideo": "播放背景视频",
    "home.pauseVideo": "暂停背景视频",
  },
} as const;

type MessageKey = keyof typeof messages.en;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") {
    return "en";
  }

  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "zh"
    ? "zh"
    : "en";
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const initialLocale = getInitialLocale();
    setLocaleState(initialLocale);
    document.documentElement.lang = initialLocale === "zh" ? "zh-CN" : "en";
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const setLocale = (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
      document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : "en";
    };

    return {
      locale,
      setLocale,
      t: (key) => messages[locale][key] ?? messages.en[key],
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
};
