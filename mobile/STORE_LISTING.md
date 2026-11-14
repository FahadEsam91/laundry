# Store listing: copy, answers and assets

Everything the App Store and Google Play forms ask for. Screenshots and graphics are in `store-assets/`.
Replace `https://68-183-76-10.sslip.io` with your own domain once you have one.

## Nuqa (customer app)

| Field | Value |
|---|---|
| App name | نقاء – غسيل وكوي وتوصيل  ·  Nuqa – Laundry Delivery |
| Subtitle (iOS, max 30) | غسيل وكوي يوصل لبابك  ·  Laundry & ironing, delivered |
| Short description (Play, max 80) | اطلب الغسيل والكوي من أفضل المغاسل، نستلم ونوصّل لباب بيتك  ·  Order laundry & ironing from top laundries. We pick up and deliver. |
| Category | Lifestyle (secondary: Shopping) · Play: Lifestyle |
| Keywords (iOS, max 100) | غسيل,كوي,مغسلة,تنظيف جاف,دشداشة,عباية,سجاد,laundry,dry cleaning,ironing |
| Price | Free |
| Age rating | 4+ (iOS) · Everyone (Play), no objectionable content |
| Privacy policy URL | https://68-183-76-10.sslip.io/privacy |
| Terms / EULA | https://68-183-76-10.sslip.io/terms |
| Support URL | https://68-183-76-10.sslip.io |
| Marketing URL (optional) | https://68-183-76-10.sslip.io |
| Copyright | © 2026 Nuqa |

### Description (AR)
نقاء يوصلك بأفضل المغاسل في مدينتك. اطلب الغسيل والكوي والتنظيف الجاف من هاتفك، ومندوبنا يستلم ملابسك من باب بيتك ويرجعها نظيفة ومكوية.

• خدمات متكاملة: غسيل وكوي، كوي فقط، تنظيف جاف، غسيل بالكيلو، أحذية، بطانيات ومفروشات، سجاد، ستائر، وخياطة.
• أسعار واضحة لكل قطعة قبل أن تطلب.
• خدمة مستعجلة خلال ساعات.
• اختر وقت الاستلام الذي يناسبك.
• تتبع مباشر للمندوب على الخريطة وإشعار في كل مرحلة.
• الدفع نقداً أو بالبطاقة عند الاستلام.
• قيّم المغسلة بعد كل طلب وأعد الطلب بضغطة.

### Description (EN)
Nuqa connects you with the best laundries in your city. Order washing, ironing and dry cleaning from your phone. A rider collects from your door and brings everything back fresh and pressed.

• Every service: wash & iron, ironing, dry cleaning, wash & fold by kg, shoes, bedding, carpets, curtains and alterations
• Clear per-item prices before you order
• Express turnaround in hours
• Pick the collection time that suits you
• Live rider tracking on the map and a notification at every step
• Pay cash or by card on delivery
• Rate your laundry after every order and reorder in one tap

### What's new (first version)
AR: الإصدار الأول من نقاء.  EN: The first release of Nuqa.

### App Review information (Apple) / App access (Google Play)
The app signs in with a phone number and an SMS code. Give reviewers the fixed login that
`deploy/go-live.sh` prints (no SMS is sent to that number):

> Sign in with phone **+9647000000001** and code **(the code go-live.sh printed)**.
> Then pick a laundry, add items, choose an address on the map and place an order with “Cash”.
> Account deletion: Account → Delete account.

Contact: your name, phone and email.

### Privacy answers
**Apple “App Privacy”**: data linked to the user, used for App Functionality only, no tracking:
- Contact info: Name, Phone number
- Location: Precise location (delivery address and rider tracking)
- User content: Photos (optional photos of the customer's items attached to an order), order notes
- Identifiers: User ID; Device ID (push notification token)
- Purchases: Purchase history (orders)

**Google Play “Data safety”**: collected, not shared, encrypted in transit, users can request deletion (in-app):
- Personal info: Name, Phone number, Address
- Location: Precise location
- Photos and videos: Photos (optional, attached to an order; only the laundry and support see them)
- App activity: Other actions (orders)
- Device or other IDs (push token)
- Purpose: App functionality, Account management

**Other Play declarations**: Ads: No · Content rating questionnaire: Utility/Shopping, no violence etc. ·
Target audience: 18+ · News app: No · Government app: No · Financial features: None ·
Location permission: foreground only (address and live tracking). Camera/photos: only when the customer chooses to attach item photos.

### Assets (`store-assets/`)
| Store | Files | Size |
|---|---|---|
| App Store (iPhone 6.9") | `ios/ar/1-5.jpg`, `ios/en/1-5.jpg` | 1320 × 2868 |
| App Store icon | `ios/icon-1024.png` | 1024 × 1024 (EAS also embeds it in the build) |
| Google Play phone | `android/ar/1-5.jpg`, `android/en/1-5.jpg` | 1080 × 1920 |
| Google Play feature graphic | `android/feature-graphic-ar.jpg`, `-en.jpg` | 1024 × 500 |
| Google Play icon | `android/icon-512.png` | 512 × 512 |

## Nuqa Rider

**Name:** نقاء للمندوبين · Nuqa Rider
**Category:** Business
**Description (AR):** تطبيق مندوبي توصيل نقاء: استقبل مهام الاستلام والتوصيل، شارك موقعك أثناء العمل، تنقّل إلى الزبون والمغسلة بضغطة، وتابع أرباحك اليومية. التطبيق مخصص لمندوبي نقاء المسجلين.
**Description (EN):** The app for Nuqa delivery riders: receive pickup and delivery jobs, share your location while online, navigate to customers and laundries in one tap, and track your daily earnings. For registered Nuqa riders only.
**Review note:** Rider accounts are created by the operator in the admin dashboard. Create a rider with the reviewer
phone number in Admin → Riders before submitting, and give reviewers that number and its code.
