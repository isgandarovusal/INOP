# FB Product Showcase

Bu repo frontend və backend ilə tam işlək bir `product showcase` layihəsidir. Məqsəd tələbələrin real məhsul idarəetmə sisteminin frontend və backend hissələrini birlikdə qura bilməsidir.

## Nə var burada?

- `Backend/` — Express + MongoDB API, `multer` ilə şəkil yükləmə dəstəyi
- `Frontend/` — React + Vite + TypeScript tətbiqi, admin və sayt üzəri görünüşləri
- `docker-compose.yml` — Mongo, backend və frontend üçün konteynerləşdirmə

## Texnologiya stəqi

- Backend: Node.js, Express, Mongoose, multer, dotenv, cors
- Frontend: React, React Router, TypeScript, Vite, Axios
- Containerization: Docker, Docker Compose

## Layihə məqsədi

Bu layihə tələbələrə imkan verir ki, həm frontend, həm də backend hissələrini bir yerdə başa düşsünlər:

1. Backend API yazmaq
2. Frontend üzərində data çəkmək
3. Admin paneldə CRUD əməliyyatlarını reallaşdırmaq
4. Docker ilə hər iki hissəni birgə işə salmaq

## Docker ilə necə işə salmaq olar

Layihənin kök kataloquna gedin:

```bash
cd /c/Users/Namiq/Desktop/fb
```

Konteynerləri qurun və işə salın:

```bash
docker compose up --build
```

Fon rejimində işə salmaq üçün:

```bash
docker compose up --build -d
```

Servisləri yoxlayın:

```bash
docker compose ps
```

Dayandırmaq üçün:

```bash
docker compose down
```

### Docker-un açdığı portlar

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:2001`
- MongoDB: `mongodb://localhost:27017`

> Əgər `2001` portu da tutulubsa, `docker-compose.yml` faylında `backend` xidmətinin `ports:` xəttini dəyişə bilərsiniz.

## Layihənin strukturuna qısa baxış

- `Backend/routes/route.js` — məhsul routeları
- `Backend/controllers/products.controller.js` — CRUD məntiqi
- `Backend/models/products.model.js` — məhsul modeli
- `Frontend/src/Context/Context.tsx` — qlobal state və API funksiyaları
- `Frontend/src/Pages/Admin/` — admin səhifələri
- `Frontend/src/Pages/Site/` — istifadəçi-facing səhifələr
- `Frontend/src/Routes/Routes.tsx` — routelər

## Tələbə tapşırığı: Product Management Experience

Bu tapşırıq məhsul səviyyəli bir taskdır. Məqsəd tələbələrin həm frontend, həm də backend-i bir yerdə idarə edə bilmələri və Docker ilə tətbiqi işlədə bilmələri.

### Məhsul məqsədi

`FB Product Showcase` saytı aşağıdakı funksionallığı təmin etməlidir:

- İstifadəçi tərəfi:
  - Məhsul siyahısı
  - Məhsul məlumatlarının görüntülənməsi
  - Məhsul şəkillərinin göstərilməsi
  - Axtarış/filter (optional)

- Admin tərəfi:
  - Mövcud məhsulların siyahısı
  - Yeni məhsul əlavə etmə
  - Məhsul redaktəsi
  - Məhsul silmə

- Backend API:
  - `GET /products`
  - `GET /products/:id`
  - `POST /products`
  - `PUT /products/:id`
  - `DELETE /products/:id`

### Solo şəxs üçün task yönümləri

Əgər tək işləyirsinizsə, aşağıdakı tapşırıqları seçə bilərsiniz:

- Bir səhifənin frontend hissəsini tam yazın və backend API-dən data çəkin
- Məsələn: `Home` səhifəsini düzəldin, məhsulları backend-dən çəkin və göstər
- Və ya `Products` admin səhifəsini düzəldin, siyahını çəkin, silmə funksiyası işləsin

Solo developer üçün ideal iş axını:

1. `git branch feature/<adınız>-<tapşırıq>`
2. Backend API və ya frontend səhifə üçün lazım olan endpoint-ləri tamamlayın
3. Eyni zamanda həmin səhifə üçün data çəkmə və renderlogu yazın
4. Bütün faylları commit edib push edin

### Qrup üçün task yönümləri

Qrupda hər bir üzv aşağıdakı rolları ala bilər:

- Backend modeli / controller yazan
- API routelərini quran
- Frontend səhifə komponentlərini hazırlayan
- UI dizayn və data çəkmə üzərində çalışan

Qrup olaraq fayl paylanması belə ola bilər:

- Üzv A: `GET /products`, `GET /products/:id`, model + controller
- Üzv B: `POST /products`, `PUT /products/:id`, `DELETE /products/:id`
- Üzv C: `Frontend/src/Pages/Site/Home/Home.tsx`, `Frontend/src/Pages/Site/Shop/Shop.tsx`
- Üzv D: `Frontend/src/Pages/Admin/Products/Products.tsx`, `Frontend/src/Pages/Admin/Add/Add.tsx`, `Frontend/src/Pages/Admin/Edit/Edit.tsx`

Hər bir üzv öz səhifəsini və ya API funksiyasını ayrıca tamamlaya bilər.

> Qrup şəklində işləyərkən, hər bir üzv "hər səhifədə data çəkəcək" demək, yəni frontend səhifə komponentləri özəl API sorğularını yazacaq. Backend tərəfdən isə hər routeda müvafiq controller funksiyası mövcud olacaq.

## Tapşırıq tələbləri

### 1) Backend tələbləri

- Məhsul modelində ən azı bu sahələr olsun:
  - `title`
  - `description`
  - `price`
  - `images` (array)
  - `category`
  - `createdAt`
- `multer` ilə şəkil yükləmə funksiyası olsun
- `POST /products` və `PUT /products/:id` endpointləri form-data qəbul etsin
- `GET /products` endpointində axtarış və ya kateqoriya filteri əlavə etmək üstünlükdür
- Hər bir endpoint JSON formatında cavab qaytarsın

### 2) Frontend tələbləri

- Material və ya sadə CSS ilə mobil və masaüstü uyğun interfeys
- `Home` səhifəsi üçün məhsulların görüntülənməsi
- Admin paneldə `Products`, `Add`, `Edit` səhifələri tam işlək olsun
- `Context` istifadə edib API sorğularını mərkəzləşdirin
- `axios` ilə backend-ə sorğular göndərin
- `image` URL-ləri düzgün göstərilsin

### 3) Docker tələbləri

- Repo kökündə `docker-compose.yml` olmalıdır
- Docker Compose ilə aşağıdakıları işə salın:
  - MongoDB
  - Backend
  - Frontend
- `docker compose up --build` əmrini istifadə edin
- `docker compose ps` ilə servis statusunu yoxlayın

## Burada necə yazmaq lazımdır

### Commit və branch trip

- Hər bir tapşırıq üçün yeni branch açın
- Commit-lər qısa və məqsədyönlü olsun:
  - `feat: add product list page`
  - `fix: correct API URL in frontend`
  - `docs: add README deployment instructions`
- Push edərkən branch adı aydın olsun

### Tapşırıq məzmununu README-də necə göstərmək olar

1. Layihənin məqsədi və istifadə olunan texnologiyalar
2. Qısa struktur izahı
3. Docker qurulması və işə salınması
4. Solo və qrup üçün tapşırıq bölməsi
5. Backend və frontend tələbləri
6. Necə push edib göndərmək

## Nümunə iş axını

1. `git clone <repo>`
2. `cd fb`
3. `docker compose up --build`
4. `http://localhost:3000`-a daxil olun
5. Adminə yeni məhsul əlavə edin
6. Dəyişiklikləri commit edib push edin

## Frontend və Backend URL konfiqurasiyası

- Frontend `API_URL` env dəyişəni ilə backend-ə qoşulur
- Docker Compose-da backend servisi `backend:2000` olaraq işləyir
- Host üzərində frontend üçün `localhost:3000`

## Push etmə və təqdimat

- Hər kəs öz branch-i ayrı saxlasın
- Branch adı və commit mesajı aydın olsun
- Demo ekranı qrupa göndərin: frontend `http://localhost:3000`
- Hər kəs öz işi ilə bağlı qısa izahat yazsın

---

