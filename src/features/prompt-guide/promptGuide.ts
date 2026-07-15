export type PromptType = 'basic' | 'repeat' | 'pause' | 'advanced';

export interface PromptGuideInput {
  promptTopic: string;
  promptMainIdeas: string;
  promptType: PromptType;
}

export function buildPromptGuide({ promptTopic, promptMainIdeas, promptType }: PromptGuideInput) {
    const topicText = promptTopic.trim() || 'Giao thĂ´ng cĂ´ng cá»™ng';
    const mainIdeasText = promptMainIdeas.trim() || 'Khuyáº¿n khĂ­ch cĂ´ng dĂ¢n sá»­ dá»¥ng phÆ°Æ¡ng tiá»‡n cĂ´ng cá»™ng Ä‘á»ƒ giáº£m Ă¹n táº¯c vĂ  giáº£m Ă´ nhiá»…m mĂ´i trÆ°á»ng.';

    let timingRequirements = '';
    let formatRequirements = '';
    let exampleText = '';

    switch (promptType) {
      case 'pause': // Máº«u trĂªn lĂ  /
        timingRequirements = `YĂªu cáº§u vá» thá»i gian nghá»‰:
* Cuá»‘i má»—i dĂ²ng pháº£i cĂ³ kĂ½ hiá»‡u /Y.
* Y lĂ  sá»‘ giĂ¢y nghá»‰ Ä‘á»ƒ ngÆ°á»i há»c nghe, hiá»ƒu vĂ  nháº¡i láº¡i trá»n váº¹n dĂ²ng Ä‘Ă³.
* KhĂ´ng quy Ä‘á»‹nh sá»‘ giĂ¢y cá»‘ Ä‘á»‹nh theo loáº¡i tá»«, cá»¥m tá»« hoáº·c cĂ¢u.
* HĂ£y tá»± Ä‘iá»u chá»‰nh thá»i gian theo sá»‘ lÆ°á»£ng tá»«, Ä‘á»™ dĂ i ná»™i dung, Ä‘á»™ khĂ³ phĂ¡t Ă¢m vĂ  tá»‘c Ä‘á»™ nháº¡i láº¡i cá»§a ngÆ°á»i há»c bĂ¬nh thÆ°á»ng.
* Ná»™i dung ngáº¯n vĂ  dá»… cĂ³ thá»ƒ dĂ¹ng thá»i gian nghá»‰ ngáº¯n hÆ¡n.
* Ná»™i dung dĂ i hoáº·c khĂ³ pháº£i cĂ³ thá»i gian nghá»‰ dĂ i hÆ¡n.
* Thá»i gian pháº£i Ä‘á»§ thoáº£i mĂ¡i Ä‘á»ƒ ngÆ°á»i há»c nghe xong rá»“i nháº¡i láº¡i Ä‘áº§y Ä‘á»§, khĂ´ng Ä‘Æ°á»£c chuyá»ƒn quĂ¡ nhanh.
* CĂ³ thá»ƒ dĂ¹ng sá»‘ nguyĂªn hoáº·c sá»‘ tháº­p phĂ¢n, vĂ­ dá»¥: /2.5, /4, /6.5, /9.`;

        formatRequirements = `YĂªu cáº§u Ä‘á»‹nh dáº¡ng:
* Viáº¿t cĂ¡c dĂ²ng liá»n nhau hoĂ n toĂ n.
* KhĂ´ng Ä‘á»ƒ dĂ²ng trá»‘ng.
* KhĂ´ng Ä‘Ă¡nh sá»‘ thá»© tá»±.
* KhĂ´ng dĂ¹ng dáº¥u Ä‘áº§u dĂ²ng.
* KhĂ´ng thĂªm tiĂªu Ä‘á».
* KhĂ´ng thĂªm lá»i giáº£i thĂ­ch trÆ°á»›c hoáº·c sau bĂ i.
* KhĂ´ng dĂ¹ng dáº¥u cháº¥m pháº©y (;).
* Má»—i dĂ²ng pháº£i káº¿t thĂºc báº±ng kĂ½ hiá»‡u thá»i gian /Y.
* Äáº§u ra chá»‰ chá»©a danh sĂ¡ch vÄƒn báº£n thĂ´ Ä‘á»ƒ sao chĂ©p trá»±c tiáº¿p vĂ o á»©ng dá»¥ng.`;

        exampleText = `VĂ­ dá»¥ cĂ¡ch phĂ¡t triá»ƒn ná»™i dung:
Chá»§ Ä‘á»: Giao thĂ´ng cĂ´ng cá»™ng
giao thĂ´ng cĂ´ng cá»™ng /3
public transportation /3.5
sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng /4
use public transportation /4.5
khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng /6
encourage people to use public transportation /6.5
TrÆ°á»›c háº¿t, chĂ­nh phá»§ nĂªn khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng. /9
Firstly, governments should encourage people to use public transportation. /9.5
sá»‘ lÆ°á»£ng Ă´ tĂ´ /3
the number of cars /3.5
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ /4
reduce the number of cars /4.5
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng /5.5
reduce the number of cars on the road /6
Äiá»u nĂ y cĂ³ thá»ƒ giĂºp giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng. /8
This can help reduce the number of cars on the road. /8.5
táº¯c ngháº½n giao thĂ´ng /3
traffic congestion /3.5
giáº£m táº¯c ngháº½n giao thĂ´ng /4.5
reduce traffic congestion /5
giáº£m táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n /6
reduce traffic congestion in major cities /6.5
Nhá» Ä‘Ă³, tĂ¬nh tráº¡ng táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n cĂ³ thá»ƒ Ä‘Æ°á»£c giáº£m bá»›t. /10
As a result, traffic congestion in major cities can be reduced. /10.5`;
        break;

      case 'advanced': // Máº«u ; /
        timingRequirements = `YĂªu cáº§u vá» táº§n suáº¥t láº·p vĂ  thá»i gian nghá»‰:
* Cuá»‘i má»—i dĂ²ng pháº£i cĂ³ kĂ½ hiá»‡u ;X /Y.
* X lĂ  sá»‘ láº§n láº·p Ä‘á»c láº¡i cá»§a cĂ¢u Ä‘Ă³ (vĂ­ dá»¥: ;2 hoáº·c ;3 tĂ¹y thuá»™c Ä‘á»™ dĂ i hoáº·c Ä‘á»™ khĂ³ cá»§a máº«u tá»«/cĂ¢u Ä‘á»ƒ há»c viĂªn nháº¡i láº¡i nhiá»u láº§n).
* Y lĂ  sá»‘ giĂ¢y nghá»‰ Ä‘á»ƒ ngÆ°á»i há»c nghe, hiá»ƒu vĂ  nháº¡i láº¡i trá»n váº¹n dĂ²ng Ä‘Ă³ sau khi láº·p xong.
* KhĂ´ng quy Ä‘á»‹nh sá»‘ giĂ¢y cá»‘ Ä‘á»‹nh theo loáº¡i tá»«, cá»¥m tá»« hoáº·c cĂ¢u.
* HĂ£y tá»± Ä‘iá»u chá»‰nh sá»‘ láº§n láº·p vĂ  thá»i gian theo sá»‘ lÆ°á»£ng tá»«, Ä‘á»™ dĂ i ná»™i dung, Ä‘á»™ khĂ³ phĂ¡t Ă¢m vĂ  tá»‘c Ä‘á»™ nháº¡i láº¡i cá»§a ngÆ°á»i há»c bĂ¬nh thÆ°á»ng.
* Thá»i gian pháº£i Ä‘á»§ thoáº£i mĂ¡i Ä‘á»ƒ ngÆ°á»i há»c nghe xong rá»“i nháº¡i láº¡i Ä‘áº§y Ä‘á»§, khĂ´ng Ä‘Æ°á»£c chuyá»ƒn quĂ¡ nhanh.`;

        formatRequirements = `YĂªu cáº§u Ä‘á»‹nh dáº¡ng:
* Viáº¿t cĂ¡c dĂ²ng liá»n nhau hoĂ n toĂ n.
* KhĂ´ng Ä‘á»ƒ dĂ²ng trá»‘ng.
* KhĂ´ng Ä‘Ă¡nh sá»‘ thá»© tá»±.
* KhĂ´ng dĂ¹ng dáº¥u Ä‘áº§u dĂ²ng.
* KhĂ´ng thĂªm tiĂªu Ä‘á».
* KhĂ´ng thĂªm lá»i giáº£i thĂ­ch trÆ°á»›c hoáº·c sau bĂ i.
* Má»—i dĂ²ng pháº£i káº¿t thĂºc báº±ng kĂ½ hiá»‡u ;X /Y.
* Äáº§u ra chá»‰ chá»©a danh sĂ¡ch vÄƒn báº£n thĂ´ Ä‘á»ƒ sao chĂ©p trá»±c tiáº¿p vĂ o á»©ng dá»¥ng.`;

        exampleText = `VĂ­ dá»¥ cĂ¡ch phĂ¡t triá»ƒn ná»™i dung:
Chá»§ Ä‘á»: Giao thĂ´ng cĂ´ng cá»™ng
giao thĂ´ng cĂ´ng cá»™ng ;2 /3
public transportation ;2 /3.5
sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng ;2 /4
use public transportation ;2 /4.5
khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng ;3 /6
encourage people to use public transportation ;3 /6.5
TrÆ°á»›c háº¿t, chĂ­nh phá»§ nĂªn khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng. ;3 /9
Firstly, governments should encourage people to use public transportation. ;3 /9.5
sá»‘ lÆ°á»£ng Ă´ tĂ´ ;2 /3
the number of cars ;2 /3.5
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ ;2 /4
reduce the number of cars ;2 /4.5
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng ;3 /5.5
reduce the number of cars on the road ;3 /6
Äiá»u nĂ y cĂ³ thá»ƒ giĂºp giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng. ;3 /8
This can help reduce the number of cars on the road. ;3 /8.5
táº¯c ngháº½n giao thĂ´ng ;2 /3
traffic congestion ;2 /3.5
giáº£m táº¯c ngháº½n giao thĂ´ng ;2 /4.5
reduce traffic congestion ;2 /5
giáº£m táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n ;3 /6
reduce traffic congestion in major cities ;3 /6.5
Nhá» Ä‘Ă³, tĂ¬nh tráº¡ng táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n cĂ³ thá»ƒ Ä‘Æ°á»£c giáº£m bá»›t. ;3 /10
As a result, traffic congestion in major cities can be reduced. ;3 /10.5`;
        break;

      case 'repeat': // Máº«u chá»‰ cĂ³ ;
        timingRequirements = `YĂªu cáº§u vá» sá»‘ láº§n láº·p láº¡i:
* Cuá»‘i má»—i dĂ²ng pháº£i cĂ³ kĂ½ hiá»‡u ;X.
* X lĂ  sá»‘ láº§n láº·p Ä‘á»c láº¡i cá»§a cĂ¢u Ä‘Ă³ Ä‘á»ƒ há»c viĂªn nháº¡i Ä‘i nháº¡i láº¡i nhiá»u láº§n (vĂ­ dá»¥: ;2 hoáº·c ;3 tĂ¹y thuá»™c Ä‘á»™ dĂ i hoáº·c Ä‘á»™ khĂ³ cá»§a máº«u tá»«/cĂ¢u).
* KHĂ”NG sá»­ dá»¥ng kĂ½ hiá»‡u gáº¡ch chĂ©o / Ä‘á»ƒ chia khoáº£ng nghá»‰ trong máº«u nĂ y.`;

        formatRequirements = `YĂªu cáº§u Ä‘á»‹nh dáº¡ng:
* Viáº¿t cĂ¡c dĂ²ng liá»n nhau hoĂ n toĂ n.
* KhĂ´ng Ä‘á»ƒ dĂ²ng trá»‘ng.
* KhĂ´ng Ä‘Ă¡nh sá»‘ thá»© tá»±.
* KhĂ´ng dĂ¹ng dáº¥u Ä‘áº§u dĂ²ng.
* KhĂ´ng thĂªm tiĂªu Ä‘á».
* KhĂ´ng thĂªm lá»i giáº£i thĂ­ch trÆ°á»›c hoáº·c sau bĂ i.
* KhĂ´ng dĂ¹ng dáº¥u gáº¡ch chĂ©o (/).
* Má»—i dĂ²ng pháº£i káº¿t thĂºc báº±ng kĂ½ hiá»‡u ;X.
* Äáº§u ra chá»‰ chá»©a danh sĂ¡ch vÄƒn báº£n thĂ´ Ä‘á»ƒ sao chĂ©p trá»±c tiáº¿p vĂ o á»©ng dá»¥ng.`;

        exampleText = `VĂ­ dá»¥ cĂ¡ch phĂ¡t triá»ƒn ná»™i dung:
Chá»§ Ä‘á»: Giao thĂ´ng cĂ´ng cá»™ng
giao thĂ´ng cĂ´ng cá»™ng ;2
public transportation ;2
sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng ;2
use public transportation ;2
khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng ;3
encourage people to use public transportation ;3
TrÆ°á»›c háº¿t, chĂ­nh phá»§ nĂªn khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng. ;3
Firstly, governments should encourage people to use public transportation. ;3
sá»‘ lÆ°á»£ng Ă´ tĂ´ ;2
the number of cars ;2
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ ;2
reduce the number of cars ;2
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng ;3
reduce the number of cars on the road ;3
Äiá»u nĂ y cĂ³ thá»ƒ giĂºp giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng. ;3
This can help reduce the number of cars on the road. ;3
táº¯c ngháº½n giao thĂ´ng ;2
traffic congestion ;2
giáº£m táº¯c ngháº½n giao thĂ´ng ;2
reduce traffic congestion ;2
giáº£m táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n ;3
reduce traffic congestion in major cities ;3
Nhá» Ä‘Ă³, tĂ¬nh tráº¡ng táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n cĂ³ thá»ƒ Ä‘Æ°á»£c giáº£m bá»›t. ;3
As a result, traffic congestion in major cities can be reduced. ;3`;
        break;

      case 'basic': // Máº«u khĂ´ng cĂ³ / hay ;
      default:
        timingRequirements = `YĂªu cáº§u Ä‘á»‹nh dáº¡ng:
* KHĂ”NG sá»­ dá»¥ng báº¥t ká»³ kĂ½ tá»± phĂ¢n tĂ¡ch Ä‘áº·c biá»‡t nĂ o khĂ¡c (khĂ´ng cĂ³ ; vĂ  khĂ´ng cĂ³ /). Chá»‰ xuáº¥t vÄƒn báº£n thuáº§n tuĂ½.`;

        formatRequirements = `YĂªu cáº§u Ä‘á»‹nh dáº¡ng:
* Viáº¿t cĂ¡c dĂ²ng liá»n nhau hoĂ n toĂ n.
* KhĂ´ng Ä‘á»ƒ dĂ²ng trá»‘ng.
* KhĂ´ng Ä‘Ă¡nh sá»‘ thá»© tá»±.
* KhĂ´ng dĂ¹ng dáº¥u Ä‘áº§u dĂ²ng.
* KhĂ´ng thĂªm tiĂªu Ä‘á».
* KhĂ´ng thĂªm lá»i giáº£i thĂ­ch trÆ°á»›c hoáº·c sau bĂ i.
* Äáº§u ra chá»‰ chá»©a danh sĂ¡ch dĂ²ng chá»¯ thĂ´ nhÆ° cáº¥u trĂºc máº«u dÆ°á»›i Ä‘Ă¢y, khĂ´ng cáº§n tiĂªu Ä‘á» hay giáº£i thĂ­ch thĂªm.`;

        exampleText = `VĂ­ dá»¥ cĂ¡ch phĂ¡t triá»ƒn ná»™i dung:
Chá»§ Ä‘á»: Giao thĂ´ng cĂ´ng cá»™ng
giao thĂ´ng cĂ´ng cá»™ng
public transportation
sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng
use public transportation
khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng
encourage people to use public transportation
TrÆ°á»›c háº¿t, chĂ­nh phá»§ nĂªn khuyáº¿n khĂ­ch ngÆ°á»i dĂ¢n sá»­ dá»¥ng giao thĂ´ng cĂ´ng cá»™ng.
Firstly, governments should encourage people to use public transportation.
sá»‘ lÆ°á»£ng Ă´ tĂ´
the number of cars
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´
reduce the number of cars
giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng
reduce the number of cars on the road
Äiá»u nĂ y cĂ³ thá»ƒ giĂºp giáº£m sá»‘ lÆ°á»£ng Ă´ tĂ´ trĂªn Ä‘Æ°á»ng.
This can help reduce the number of cars on the road.
táº¯c ngháº½n giao thĂ´ng
traffic congestion
giáº£m táº¯c ngháº½n giao thĂ´ng
reduce traffic congestion
giáº£m táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n
reduce traffic congestion in major cities
Nhá» Ä‘Ă³, tĂ¬nh tráº¡ng táº¯c ngháº½n giao thĂ´ng á»Ÿ cĂ¡c thĂ nh phá»‘ lá»›n cĂ³ thá»ƒ Ä‘Æ°á»£c giáº£m bá»›t.
As a result, traffic congestion in major cities can be reduced.`;
        break;
    }

    return `HĂ£y soáº¡n má»™t bĂ i luyá»‡n nghe â€“ nháº¡i song ngá»¯ theo chá»§ Ä‘á»:

Chá»§ Ä‘á»: ${topicText}

Ná»™i dung hoáº·c Ă½ chĂ­nh cáº§n phĂ¡t triá»ƒn:
${mainIdeasText}

HĂ£y táº¡o má»™t Ä‘oáº¡n ngáº¯n gá»“m cĂ¡c cĂ¢u cĂ³ ná»™i dung liĂªn káº¿t tá»± nhiĂªn vá»›i nhau.

Vá»›i tá»«ng cĂ¢u hoĂ n chá»‰nh, hĂ£y xĂ¢y dá»±ng ná»™i dung tá»« tá»« theo trĂ¬nh tá»±:
tá»« hoáº·c Ă½ trá»ng tĂ¢m â†’ cá»¥m tá»« ngáº¯n â†’ cá»¥m tá»« dĂ i hÆ¡n â†’ cĂ¢u hoĂ n chá»‰nh

Tá»« vĂ  cá»¥m tá»« á»Ÿ bÆ°á»›c trÆ°á»›c pháº£i Ä‘Æ°á»£c lá»“ng láº¡i vĂ o bÆ°á»›c sau. Sau khi hoĂ n thĂ nh má»™t cĂ¢u, má»›i chuyá»ƒn sang xĂ¢y dá»±ng cĂ¢u tiáº¿p theo theo cĂ¹ng quy trĂ¬nh.

YĂªu cáº§u song ngá»¯:
* LuĂ´n viáº¿t tiáº¿ng Viá»‡t trÆ°á»›c.
* DĂ²ng tiáº¿ng Anh tÆ°Æ¡ng á»©ng Ä‘áº·t ngay bĂªn dÆ°á»›i.
* Má»—i ná»™i dung pháº£i cĂ³ Ä‘á»§ má»™t cáº·p Viá»‡t â€“ Anh.
* Báº£n dá»‹ch pháº£i tá»± nhiĂªn, sĂ¡t nghÄ©a vĂ  dá»… nháº¡i láº¡i.
* CĂ¡c tá»«, cá»¥m tá»« vĂ  cĂ¢u pháº£i liĂªn káº¿t vá»›i nhau, khĂ´ng Ä‘Æ°á»£c rá»i ráº¡c.
* CĂ¡c cĂ¢u hoĂ n chá»‰nh cuá»‘i cĂ¹ng pháº£i táº¡o thĂ nh má»™t Ä‘oáº¡n ngáº¯n cĂ³ máº¡ch Ă½ rĂµ rĂ ng.

${timingRequirements}

${formatRequirements}

${exampleText}

HĂ£y Ă¡p dá»¥ng Ä‘Ăºng cĂ¡ch phĂ¡t triá»ƒn trĂªn cho chá»§ Ä‘á» tĂ´i cung cáº¥p, nhÆ°ng khĂ´ng sao chĂ©p ná»™i dung vĂ­ dá»¥.`;
  };
