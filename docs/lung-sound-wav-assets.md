# Lung sound WAV assets

Các bản ghi WAV hoàn chỉnh do firmware gửi về được đặt trong thư mục `public/audio/` và sử dụng mã bản ghi làm tên file:

- `public/audio/REC-001.wav`
- `public/audio/REC-002.wav`
- `public/audio/REC-003.wav`
- `public/audio/REC-004.wav`
- `public/audio/REC-005.wav`

WaveSurfer.js tải trực tiếp các file này thông qua đường dẫn `/audio/{recordingId}.wav`.

Các giá trị `start` và `end` của respiratory cycle được tính bằng giây và phải nằm trong thời lượng thực tế của file WAV tương ứng. Dữ liệu cycle gồm:

- `start`: thời điểm bắt đầu cycle.
- `end`: thời điểm kết thúc cycle.
- `classification`: nhãn AI của cycle.
- `confidence`: độ tin cậy của nhãn.

Không tạo waveform minh họa hoặc dữ liệu audio giả. Nếu file WAV chưa tồn tại, giao diện WaveSurfer không thể render waveform của bản ghi đó.

## Fixture dùng để kiểm tra UI

Trong giai đoạn chưa có dữ liệu firmware, có thể tạo `REC-001.wav` tổng hợp bằng:

```bash
python3 scripts/generate_mock_lung_sound.py
```

Fixture này chỉ phục vụ kiểm tra WaveSurfer, timeline và cycle regions. Đây không phải bản ghi y khoa và không được dùng cho phân tích hoặc đánh giá mô hình.
