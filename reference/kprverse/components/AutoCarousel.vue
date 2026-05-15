<template>
  <div class="carousel-container" @mouseenter="pauseAutoPlay" @mouseleave="resumeAutoPlay">
    <div class="carousel-track" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="carousel-slide"
        :class="{ active: index === currentIndex }"
      >
        <img :src="item.image" :alt="item.title" />
        <div class="slide-content">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
      </div>
    </div>

    <!-- 左右切换按钮 -->
    <button class="carousel-btn prev" @click="prevSlide">‹</button>
    <button class="carousel-btn next" @click="nextSlide">›</button>

    <!-- 指示器 -->
    <div class="carousel-indicators">
      <span
        v-for="(item, index) in items"
        :key="'indicator-' + index"
        :class="{ active: index === currentIndex }"
        @click="goToSlide(index)"
      ></span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AutoCarousel',
  props: {
    items: {
      type: Array,
      required: true,
      // 示例数据结构: { image: 'url', title: '标题', description: '描述' }
    },
    autoPlayInterval: {
      type: Number,
      default: 3000 // 自动播放间隔 ms
    }
  },
  data() {
    return {
      currentIndex: 0,
      timer: null
    };
  },
  mounted() {
    this.startAutoPlay();
  },
  beforeUnmount() {
    this.stopAutoPlay();
  },
  methods: {
    startAutoPlay() {
      this.timer = setInterval(() => {
        this.nextSlide();
      }, this.autoPlayInterval);
    },
    stopAutoPlay() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    pauseAutoPlay() {
      this.stopAutoPlay();
    },
    resumeAutoPlay() {
      this.startAutoPlay();
    },
    nextSlide() {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
    },
    prevSlide() {
      this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    },
    goToSlide(index) {
      this.currentIndex = index;
    }
  }
};
</script>

<style scoped>
.carousel-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
}

.carousel-track {
  display: flex;
  transition: transform 0.5s ease-in-out;
}

.carousel-slide {
  min-width: 100%;
  position: relative;
  user-select: none;
}

.carousel-slide img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  display: block;
}

.slide-content {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 20px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: #fff;
}

.slide-content h3 {
  margin: 0 0 8px;
  font-size: 24px;
}

.slide-content p {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
}

/* 左右按钮 */
.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.4);
  border: none;
  color: #fff;
  font-size: 32px;
  padding: 0 12px;
  cursor: pointer;
  border-radius: 4px;
  user-select: none;
  transition: background-color 0.3s;
}

.carousel-btn:hover {
  background-color: rgba(0, 0, 0, 0.7);
}

.prev {
  left: 10px;
}

.next {
  right: 10px;
}

/* 指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.carousel-indicators span {
  width: 10px;
  height: 10px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s;
}

.carousel-indicators span.active {
  background-color: #fff;
}
</style>