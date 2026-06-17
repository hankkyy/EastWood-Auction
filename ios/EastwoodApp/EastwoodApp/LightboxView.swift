import SwiftUI

// MARK: - Lightbox Image Viewer (matches web's full-screen lightbox)

struct NativeImageLightbox: View {
    let imageUrls: [String]
    let initialIndex: Int
    @Environment(\.dismiss) private var dismiss

    @State private var currentIndex: Int
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var showControls = true

    init(imageUrls: [String], initialIndex: Int = 0) {
        self.imageUrls = imageUrls
        self.initialIndex = initialIndex
        _currentIndex = State(initialValue: initialIndex)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                // Image with zoom + pan
                TabView(selection: $currentIndex) {
                    ForEach(Array(imageUrls.enumerated()), id: \.offset) { index, url in
                        AsyncImage(url: URL(string: url)) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFit()
                                    .scaleEffect(scale)
                                    .offset(offset)
                                    .gesture(
                                        SimultaneousGesture(
                                            magnificationGesture,
                                            dragGesture
                                        )
                                    )
                                    .onTapGesture(count: 2) {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                            if scale > 1.0 {
                                                scale = 1.0; offset = .zero
                                                lastScale = 1.0; lastOffset = .zero
                                            } else {
                                                scale = 2.0; lastScale = 2.0
                                            }
                                        }
                                    }
                                    .onTapGesture(count: 1) {
                                        withAnimation(.easeInOut(duration: 0.2)) {
                                            showControls.toggle()
                                        }
                                    }
                            case .empty:
                                ProgressView().tint(.white).scaleEffect(1.5)
                            case .failure:
                                VStack(spacing: 12) {
                                    Image(systemName: "photo").font(.system(size: 40)).foregroundStyle(.white.opacity(0.5))
                                    Text("Failed to load image").font(.caption).foregroundStyle(.white.opacity(0.5))
                                }
                            @unknown default:
                                ProgressView().tint(.white)
                            }
                        }
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: showControls ? .automatic : .never))

                // Top controls
                if showControls {
                    VStack {
                        HStack {
                            Button {
                                dismiss()
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(.white.opacity(0.9))
                            }
                            Spacer()
                            Text("\(currentIndex + 1) / \(imageUrls.count)")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.white.opacity(0.9))
                            Spacer()
                            // Spacer for symmetry
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2).opacity(0)
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 12)
                        .background(
                            LinearGradient(
                                colors: [Color.black.opacity(0.6), Color.clear],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                        Spacer()
                    }
                }

                // Bottom thumbnail strip
                if showControls && imageUrls.count > 1 {
                    VStack {
                        Spacer()
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(Array(imageUrls.enumerated()), id: \.offset) { index, url in
                                    AsyncImage(url: URL(string: url)) { phase in
                                        switch phase {
                                        case .success(let img):
                                            img.resizable().scaledToFill()
                                        default:
                                            Rectangle().fill(Color.white.opacity(0.1))
                                        }
                                    }
                                    .frame(width: 48, height: 48)
                                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                                            .stroke(currentIndex == index ? Color.white : Color.clear, lineWidth: 2)
                                    )
                                    .opacity(currentIndex == index ? 1.0 : 0.5)
                                    .onTapGesture {
                                        withAnimation { currentIndex = index }
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        .padding(.bottom, 12)
                        .background(
                            LinearGradient(
                                colors: [Color.clear, Color.black.opacity(0.6)],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                    }
                }
            }
            .navigationBarHidden(true)
            .statusBarHidden()
            .preferredColorScheme(.dark)
        }
    }

    // MARK: - Gestures

    private var magnificationGesture: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                let newScale = lastScale * value
                scale = min(max(newScale, 1.0), 5.0)
            }
            .onEnded { _ in
                lastScale = scale
                if scale <= 1.0 { offset = .zero; lastOffset = .zero }
            }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                if scale > 1.0 {
                    offset = CGSize(
                        width: lastOffset.width + value.translation.width,
                        height: lastOffset.height + value.translation.height
                    )
                }
            }
            .onEnded { _ in
                lastOffset = offset
            }
    }
}

// MARK: - Convenience modifier

extension View {
    func fullScreenLightbox(isPresented: Binding<Bool>, imageUrls: [String], initialIndex: Int = 0) -> some View {
        self.fullScreenCover(isPresented: isPresented) {
            NativeImageLightbox(imageUrls: imageUrls, initialIndex: initialIndex)
        }
    }
}
