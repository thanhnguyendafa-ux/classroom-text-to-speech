export type PromptType = 'basic' | 'repeat' | 'pause' | 'advanced';

export interface PromptGuideInput {
  promptTopic: string;
  promptMainIdeas: string;
  promptType: PromptType;
}

export function buildPromptGuide({ promptTopic, promptMainIdeas, promptType }: PromptGuideInput) {
    const topicText = promptTopic.trim() || 'Giao thông công cộng';
    const mainIdeasText = promptMainIdeas.trim() || 'Khuyến khích công dân sử dụng phương tiện công cộng để giảm ùn tắc và giảm ô nhiễm môi trường.';

    let timingRequirements = '';
    let formatRequirements = '';
    let exampleText = '';

    switch (promptType) {
      case 'pause': // Mẫu trên là /
        timingRequirements = `Yêu cầu về thời gian nghỉ:
* Cuối mỗi dòng phải có ký hiệu /Y.
* Y là số giây nghỉ để người học nghe, hiểu và nhại lại trọn vẹn dòng đó.
* Không quy định số giây cố định theo loại từ, cụm từ hoặc câu.
* Hãy tự điều chỉnh thời gian theo số lượng từ, độ dài nội dung, độ khó phát âm và tốc độ nhại lại của người học bình thường.
* Nội dung ngắn và dễ có thể dùng thời gian nghỉ ngắn hơn.
* Nội dung dài hoặc khó phải có thời gian nghỉ dài hơn.
* Thời gian phải đủ thoải mái để người học nghe xong rồi nhại lại đầy đủ, không được chuyển quá nhanh.
* Có thể dùng số nguyên hoặc số thập phân, ví dụ: /2.5, /4, /6.5, /9.`;

        formatRequirements = `Yêu cầu định dạng:
* Viết các dòng liền nhau hoàn toàn.
* Không để dòng trống.
* Không đánh số thứ tự.
* Không dùng dấu đầu dòng.
* Không thêm tiêu đề.
* Không thêm lời giải thích trước hoặc sau bài.
* Không dùng dấu chấm phẩy (;).
* Mỗi dòng phải kết thúc bằng ký hiệu thời gian /Y.
* Đầu ra chỉ chứa danh sách văn bản thô để sao chép trực tiếp vào ứng dụng.`;

        exampleText = `Ví dụ cách phát triển nội dung:
Chủ đề: Giao thông công cộng
giao thông công cộng /3
public transportation /3.5
sử dụng giao thông công cộng /4
use public transportation /4.5
khuyến khích người dân sử dụng giao thông công cộng /6
encourage people to use public transportation /6.5
Trước hết, chính phủ nên khuyến khích người dân sử dụng giao thông công cộng. /9
Firstly, governments should encourage people to use public transportation. /9.5
số lượng ô tô /3
the number of cars /3.5
giảm số lượng ô tô /4
reduce the number of cars /4.5
giảm số lượng ô tô trên đường /5.5
reduce the number of cars on the road /6
Điều này có thể giúp giảm số lượng ô tô trên đường. /8
This can help reduce the number of cars on the road. /8.5
tắc nghẽn giao thông /3
traffic congestion /3.5
giảm tắc nghẽn giao thông /4.5
reduce traffic congestion /5
giảm tắc nghẽn giao thông ở các thành phố lớn /6
reduce traffic congestion in major cities /6.5
Nhờ đó, tình trạng tắc nghẽn giao thông ở các thành phố lớn có thể được giảm bớt. /10
As a result, traffic congestion in major cities can be reduced. /10.5`;
        break;

      case 'advanced': // Mẫu ; /
        timingRequirements = `Yêu cầu về tần suất lặp và thời gian nghỉ:
* Cuối mỗi dòng phải có ký hiệu ;X /Y.
* X là số lần lặp đọc lại của câu đó (ví dụ: ;2 hoặc ;3 tùy thuộc độ dài hoặc độ khó của mẫu từ/câu để học viên nhại lại nhiều lần).
* Y là số giây nghỉ để người học nghe, hiểu và nhại lại trọn vẹn dòng đó sau khi lặp xong.
* Không quy định số giây cố định theo loại từ, cụm từ hoặc câu.
* Hãy tự điều chỉnh số lần lặp và thời gian theo số lượng từ, độ dài nội dung, độ khó phát âm và tốc độ nhại lại của người học bình thường.
* Thời gian phải đủ thoải mái để người học nghe xong rồi nhại lại đầy đủ, không được chuyển quá nhanh.`;

        formatRequirements = `Yêu cầu định dạng:
* Viết các dòng liền nhau hoàn toàn.
* Không để dòng trống.
* Không đánh số thứ tự.
* Không dùng dấu đầu dòng.
* Không thêm tiêu đề.
* Không thêm lời giải thích trước hoặc sau bài.
* Mỗi dòng phải kết thúc bằng ký hiệu ;X /Y.
* Đầu ra chỉ chứa danh sách văn bản thô để sao chép trực tiếp vào ứng dụng.`;

        exampleText = `Ví dụ cách phát triển nội dung:
Chủ đề: Giao thông công cộng
giao thông công cộng ;2 /3
public transportation ;2 /3.5
sử dụng giao thông công cộng ;2 /4
use public transportation ;2 /4.5
khuyến khích người dân sử dụng giao thông công cộng ;3 /6
encourage people to use public transportation ;3 /6.5
Trước hết, chính phủ nên khuyến khích người dân sử dụng giao thông công cộng. ;3 /9
Firstly, governments should encourage people to use public transportation. ;3 /9.5
số lượng ô tô ;2 /3
the number of cars ;2 /3.5
giảm số lượng ô tô ;2 /4
reduce the number of cars ;2 /4.5
giảm số lượng ô tô trên đường ;3 /5.5
reduce the number of cars on the road ;3 /6
Điều này có thể giúp giảm số lượng ô tô trên đường. ;3 /8
This can help reduce the number of cars on the road. ;3 /8.5
tắc nghẽn giao thông ;2 /3
traffic congestion ;2 /3.5
giảm tắc nghẽn giao thông ;2 /4.5
reduce traffic congestion ;2 /5
giảm tắc nghẽn giao thông ở các thành phố lớn ;3 /6
reduce traffic congestion in major cities ;3 /6.5
Nhờ đó, tình trạng tắc nghẽn giao thông ở các thành phố lớn có thể được giảm bớt. ;3 /10
As a result, traffic congestion in major cities can be reduced. ;3 /10.5`;
        break;

      case 'repeat': // Mẫu chỉ có ;
        timingRequirements = `Yêu cầu về số lần lặp lại:
* Cuối mỗi dòng phải có ký hiệu ;X.
* X là số lần lặp đọc lại của câu đó để học viên nhại đi nhại lại nhiều lần (ví dụ: ;2 hoặc ;3 tùy thuộc độ dài hoặc độ khó của mẫu từ/câu).
* KHÔNG sử dụng ký hiệu gạch chéo / để chia khoảng nghỉ trong mẫu này.`;

        formatRequirements = `Yêu cầu định dạng:
* Viết các dòng liền nhau hoàn toàn.
* Không để dòng trống.
* Không đánh số thứ tự.
* Không dùng dấu đầu dòng.
* Không thêm tiêu đề.
* Không thêm lời giải thích trước hoặc sau bài.
* Không dùng dấu gạch chéo (/).
* Mỗi dòng phải kết thúc bằng ký hiệu ;X.
* Đầu ra chỉ chứa danh sách văn bản thô để sao chép trực tiếp vào ứng dụng.`;

        exampleText = `Ví dụ cách phát triển nội dung:
Chủ đề: Giao thông công cộng
giao thông công cộng ;2
public transportation ;2
sử dụng giao thông công cộng ;2
use public transportation ;2
khuyến khích người dân sử dụng giao thông công cộng ;3
encourage people to use public transportation ;3
Trước hết, chính phủ nên khuyến khích người dân sử dụng giao thông công cộng. ;3
Firstly, governments should encourage people to use public transportation. ;3
số lượng ô tô ;2
the number of cars ;2
giảm số lượng ô tô ;2
reduce the number of cars ;2
giảm số lượng ô tô trên đường ;3
reduce the number of cars on the road ;3
Điều này có thể giúp giảm số lượng ô tô trên đường. ;3
This can help reduce the number of cars on the road. ;3
tắc nghẽn giao thông ;2
traffic congestion ;2
giảm tắc nghẽn giao thông ;2
reduce traffic congestion ;2
giảm tắc nghẽn giao thông ở các thành phố lớn ;3
reduce traffic congestion in major cities ;3
Nhờ đó, tình trạng tắc nghẽn giao thông ở các thành phố lớn có thể được giảm bớt. ;3
As a result, traffic congestion in major cities can be reduced. ;3`;
        break;

      case 'basic': // Mẫu không có / hay ;
      default:
        timingRequirements = `Yêu cầu định dạng:
* KHÔNG sử dụng bất kỳ ký tự phân tách đặc biệt nào khác (không có ; và không có /). Chỉ xuất văn bản thuần tuý.`;

        formatRequirements = `Yêu cầu định dạng:
* Viết các dòng liền nhau hoàn toàn.
* Không để dòng trống.
* Không đánh số thứ tự.
* Không dùng dấu đầu dòng.
* Không thêm tiêu đề.
* Không thêm lời giải thích trước hoặc sau bài.
* Đầu ra chỉ chứa danh sách dòng chữ thô như cấu trúc mẫu dưới đây, không cần tiêu đề hay giải thích thêm.`;

        exampleText = `Ví dụ cách phát triển nội dung:
Chủ đề: Giao thông công cộng
giao thông công cộng
public transportation
sử dụng giao thông công cộng
use public transportation
khuyến khích người dân sử dụng giao thông công cộng
encourage people to use public transportation
Trước hết, chính phủ nên khuyến khích người dân sử dụng giao thông công cộng.
Firstly, governments should encourage people to use public transportation.
số lượng ô tô
the number of cars
giảm số lượng ô tô
reduce the number of cars
giảm số lượng ô tô trên đường
reduce the number of cars on the road
Điều này có thể giúp giảm số lượng ô tô trên đường.
This can help reduce the number of cars on the road.
tắc nghẽn giao thông
traffic congestion
giảm tắc nghẽn giao thông
reduce traffic congestion
giảm tắc nghẽn giao thông ở các thành phố lớn
reduce traffic congestion in major cities
Nhờ đó, tình trạng tắc nghẽn giao thông ở các thành phố lớn có thể được giảm bớt.
As a result, traffic congestion in major cities can be reduced.`;
        break;
    }

    return `Hãy soạn một bài luyện nghe – nhại song ngữ theo chủ đề:

Chủ đề: ${topicText}

Nội dung hoặc ý chính cần phát triển:
${mainIdeasText}

Hãy tạo một đoạn ngắn gồm các câu có nội dung liên kết tự nhiên với nhau.

Với từng câu hoàn chỉnh, hãy xây dựng nội dung từ từ theo trình tự:
từ hoặc ý trọng tâm → cụm từ ngắn → cụm từ dài hơn → câu hoàn chỉnh

Từ và cụm từ ở bước trước phải được lồng lại vào bước sau. Sau khi hoàn thành một câu, mới chuyển sang xây dựng câu tiếp theo theo cùng quy trình.

Yêu cầu song ngữ:
* Luôn viết tiếng Việt trước.
* Dòng tiếng Anh tương ứng đặt ngay bên dưới.
* Mỗi nội dung phải có đủ một cặp Việt – Anh.
* Bản dịch phải tự nhiên, sát nghĩa và dễ nhại lại.
* Các từ, cụm từ và câu phải liên kết với nhau, không được rời rạc.
* Các câu hoàn chỉnh cuối cùng phải tạo thành một đoạn ngắn có mạch ý rõ ràng.

${timingRequirements}

${formatRequirements}

${exampleText}

Hãy áp dụng đúng cách phát triển trên cho chủ đề tôi cung cấp, nhưng không sao chép nội dung ví dụ.`;
  };
