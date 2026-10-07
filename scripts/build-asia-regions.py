"""Generate interactive SVG geometry for the illustrated Asia map.
Hand-aligned small-country outlines complement image-extracted large regions.
These are artwork hit areas, not a geographic boundary dataset.
Requires Pillow and NumPy; never modifies the source image.
"""
import ast
import json
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
image = Image.open(ROOT / "pages/continents/asia/assets/map.png").convert("RGB")
width, height = image.size
# Reuse the existing contour simplifier without executing its build job.
source = ast.parse((ROOT / "scripts/build-map-regions.py").read_text(encoding="utf-8"))
functions = [node for node in source.body if isinstance(node, ast.FunctionDef) and node.name in ("trace", "simplify")]
exec(compile(ast.Module(body=functions, type_ignores=[]), "map-contours", "exec"))

# Major outlines: detect the pale borders and flood the country interiors.
a = np.asarray(image).astype("int16")
floor = np.asarray(image.filter(ImageFilter.MinFilter(5))).astype("int16")
edges = (a[:, :, 0] - floor[:, :, 0] > 7) & (a[:, :, 1] - floor[:, :, 1] > 7)
edges = np.asarray(Image.fromarray((edges * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3))) > 0
land = (a[:, :, 0] > 24) & (a[:, :, 1] > 48) & (a[:, :, 2] > 77) & ~edges

def flood(seed):
    x, y = seed
    mask = np.zeros((height, width), dtype=bool)
    if not land[y, x]:
        raise ValueError(f"Seed is on a border: {seed}")
    queue = deque([(y, x)]); mask[y, x] = True
    while queue:
        r, c = queue.popleft()
        for nr, nc in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
            if 0 <= nr < height and 0 <= nc < width and land[nr,nc] and not mask[nr,nc]:
                mask[nr,nc] = True; queue.append((nr,nc))
    return mask

def fill_holes(mask):
    # PIL floodfill of the padded exterior preserves all enclosed label pixels.
    padded = Image.new("L", (width+2, height+2), 0)
    padded.paste(Image.fromarray((mask*255).astype("uint8")), (1,1))
    ImageDraw.floodfill(padded, (0,0), 128)
    return np.asarray(padded)[1:-1,1:-1] != 128

entries = []
region_masks = {}
def country(code, ko, en, polygons=None, seeds=None, marker=None):
    mask = Image.new("L", (width,height))
    draw = ImageDraw.Draw(mask)
    for points in polygons or []:
        draw.polygon([tuple(map(int,p.split(','))) for p in points.split()], fill=255)
    if seeds:
        pixels = np.asarray(mask) > 0
        for seed in seeds: pixels |= flood(seed)
        mask = Image.fromarray((pixels*255).astype("uint8")).filter(ImageFilter.MaxFilter(5))
        mask = Image.fromarray((fill_holes(np.asarray(mask)>0)*255).astype("uint8"))
    entry = {"id": code, "name": ko, "label": en}
    if marker: entry["marker"] = marker
    else: region_masks[code] = np.asarray(mask)>0
    entries.append(entry)

country("RU","러시아","Russia",seeds=[(900,150)],polygons=["1248,190 1258,165 1268,201 1288,221 1290,241 1273,228 1260,222", "1212,250 1216,254 1226,283 1228,300 1218,276"])
country("CN","중국","China",seeds=[(940,380)],polygons=["991,550 1008,544 1013,553 1004,563 994,565"])
country("KZ","카자흐스탄","Kazakhstan",seeds=[(605,250)])
country("MN","몽골","Mongolia",seeds=[(890,315)])
country("IN","인도","India",seeds=[(680,550)],polygons=["783,478 808,466 823,452 844,449 860,466 872,474 858,491 851,514 838,512 832,537 824,536 825,516 813,499 788,495"])
country("PK","파키스탄","Pakistan",seeds=[(613,450)])
country("AF","아프가니스탄","Afghanistan",seeds=[(554,427)])
country("IR","이란","Iran",seeds=[(453,425)])
country("IQ","이라크","Iraq",seeds=[(349,419)])
country("SA","사우디아라비아","Saudi Arabia",seeds=[(348,513)])
country("TR","튀르키예","Turkey",seeds=[(280,353)])
country("MM","미얀마","Myanmar",seeds=[(880,515)])
country("LK","스리랑카","Sri Lanka",polygons=["701,639 708,645 714,656 717,672 708,679 696,679 693,665 697,653"])
country("TW","대만","Taiwan",polygons=["1096,492 1101,499 1097,514 1091,529 1087,530 1082,520 1084,507 1090,497"])
country("KP","북한","North Korea",polygons=["1116,328 1128,321 1122,339 1116,350 1119,358 1130,368 1124,373 1113,371 1107,379 1098,371 1095,360 1102,350 1094,345 1103,338"])
country("KR","대한민국","South Korea",polygons=["1113,371 1124,373 1133,378 1143,391 1148,405 1142,417 1130,421 1117,414 1116,401 1110,391 1113,381", "1115,430 1123,428 1126,431 1120,434 1115,433"])
country("JP","일본","Japan",polygons=["1231,304 1241,306 1248,313 1260,315 1251,325 1240,324 1234,318 1225,318", "1231,329 1240,338 1244,350 1249,358 1249,378 1244,392 1248,404 1237,415 1228,415 1223,411 1215,421 1204,423 1201,431 1187,436 1183,429 1191,420 1197,412 1209,409 1219,400 1222,389 1226,377 1223,365 1227,351", "1170,431 1182,430 1186,436 1180,441 1170,442 1166,449 1160,444", "1165,444 1173,445 1174,453 1164,466 1158,459 1154,450", "1163,477 1168,476 1169,480 1164,482"])
country("NP","네팔","Nepal",polygons=["708,449 721,454 731,461 748,467 763,468 777,464 782,479 772,488 756,482 744,481 731,472 718,469 710,461"])
country("BT","부탄","Bhutan",polygons=["809,460 821,453 833,454 842,463 840,481 828,482 817,478 807,479"])
country("BD","방글াদেশ","Bangladesh",polygons=["784,487 798,492 812,491 822,498 821,509 829,520 833,539 826,539 818,523 808,528 801,519 785,518 783,507 790,504"])
country("TH","태국","Thailand",polygons=["893,572 904,568 914,576 927,572 940,577 944,592 952,611 940,614 934,621 921,624 918,634 908,627 897,618 894,639 898,658 909,676 900,680 889,667 879,663 881,648 881,625 886,609 883,590"])
country("LA","라오스","Laos",polygons=["931,522 944,521 949,531 945,543 952,551 950,562 957,571 969,580 980,598 974,610 960,605 951,592 945,576 930,573 920,576 916,563 915,551 921,549 922,537"])
country("VN","베트남","Vietnam",polygons=["949,520 962,517 973,525 982,536 975,547 969,552 973,565 983,578 991,589 1000,606 1002,628 992,642 977,649 956,660 948,655 965,643 983,635 984,618 981,603 968,582 955,568 950,557 954,549 946,540"])
country("KH","캄보디아","Cambodia",polygons=["936,614 949,612 960,607 974,611 980,622 977,638 962,646 948,650 936,642 930,630"])
country("MY","말레이시아","Malaysia",polygons=["899,677 911,679 923,688 928,703 932,716 929,726 919,723 910,716 903,707 900,693", "991,731 1003,723 1011,710 1026,705 1039,691 1053,675 1065,678 1073,690 1055,700 1049,717 1037,716 1029,727 1014,729 1005,735"])
country("ID","인도네시아","Indonesia",polygons=["844,685 857,691 869,704 881,710 889,724 903,733 914,746 923,752 928,766 945,777 943,787 932,792 918,779 906,772 896,757 883,745 876,729 861,713 850,701", "948,795 959,795 969,799 981,799 988,805 1006,802 1017,810 1025,811 1019,816 1007,815 993,812 980,815 968,809 951,806", "988,735 1004,736 1018,730 1033,730 1046,719 1052,704 1064,701 1072,715 1070,733 1064,745 1067,754 1056,765 1040,766 1030,774 1017,769 1007,771 1004,764 990,762", "1107,724 1122,722 1134,724 1149,716 1141,729 1120,735 1110,736 1107,745 1118,751 1114,764 1102,765 1105,754 1096,752 1089,764 1085,753 1093,741 1099,729", "1250,745 1263,739 1274,746 1287,744 1299,751 1310,747 1306,797 1297,801 1291,787 1281,784 1277,774 1264,770 1251,760 1242,759", "1033,813 1041,812 1047,816 1040,820", "1051,815 1064,814 1070,819 1061,822", "1078,814 1097,812 1100,819 1083,821", "1109,815 1125,811 1133,814 1127,821 1115,823", "1095,830 1105,827 1116,830 1110,834", "1133,832 1146,820 1157,816 1159,822 1150,830 1139,834"])
country("PH","필리핀","Philippines",polygons=["1090,559 1098,563 1100,573 1107,579 1103,589 1096,592 1094,605 1086,602 1081,591 1087,582 1086,570", "1094,610 1104,610 1109,620 1101,624 1093,619", "1110,602 1121,610 1124,621 1117,626 1112,619", "1111,629 1117,632 1118,642 1112,640", "1127,619 1133,623 1137,635 1131,640 1127,633", "1122,642 1132,644 1136,653 1144,647 1153,659 1157,672 1146,678 1137,671 1128,677 1119,669 1107,670 1108,660 1120,655", "1091,631 1087,639 1079,648 1075,657 1062,670 1067,657 1078,643 1084,632"])
country("TM","투르크메니스탄","Turkmenistan",polygons=["467,334 482,329 495,331 506,326 518,335 532,340 543,347 559,349 576,360 583,373 574,382 560,386 551,398 532,400 519,390 513,379 497,371 482,366 466,366 464,355"])
country("UZ","우즈베키스탄","Uzbekistan",polygons=["499,292 513,297 520,289 533,294 540,306 552,312 570,313 585,320 597,324 601,337 613,339 620,349 605,351 592,361 581,357 570,348 553,345 538,338 528,326 520,325 516,315 507,320 496,332 488,335 497,319"])
country("KG","키르기스스탄","Kyrgyzstan",polygons=["620,326 637,326 650,316 665,312 684,315 700,317 715,324 720,338 708,346 694,346 682,354 663,350 650,356 636,351 630,341 619,341"])
country("TJ","타지키스탄","Tajikistan",polygons=["615,349 627,352 635,354 645,350 655,356 668,359 681,368 682,381 670,392 656,390 643,390 632,382 624,392 613,387 602,383 592,376 594,359 609,359"])
country("GE","조지아","Georgia",polygons=["319,270 331,274 345,278 353,285 365,285 371,293 360,297 346,294 334,297 326,291"])
country("AM","아르메니아","Armenia",polygons=["335,297 347,294 359,299 372,303 380,315 369,319 357,317 350,311 336,313"])
country("AZ","아제르바이잔","Azerbaijan",polygons=["370,292 381,296 388,291 396,301 396,313 407,324 402,337 390,333 381,323 377,314 372,304", "362,321 368,321 377,329 374,335 366,332"])
country("SY","시리아","Syria",polygons=["279,366 292,369 307,365 330,358 326,377 315,389 300,398 282,408 273,403 277,386"])
country("JO","الأردن","Jordan",polygons=["278,409 291,403 302,400 316,412 309,420 298,416 285,432 269,437 267,428"])
entries[-1]["name"]="요르단"
country("YE","예멘","Yemen",polygons=["321,552 337,553 350,557 366,552 378,545 396,542 419,538 429,564 417,576 399,581 389,587 371,590 355,599 326,604 320,590 316,574"])
country("OM","오만","Oman",polygons=["463,488 475,495 486,499 500,505 503,514 491,525 488,538 477,551 463,556 452,563 431,566 422,537 449,530 455,514 461,500"])
country("AE","아랍에미리트","United Arab Emirates",polygons=["408,470 419,479 434,478 445,469 453,461 462,465 459,486 452,501 432,504 418,499 409,488"])
country("TL","동티모르","Timor-Leste",polygons=["1155,817 1165,814 1177,814 1170,820 1158,825 1153,823"])
for args in [
 ("CY","키프로스","Cyprus",[251,377]),("LB","레바논","Lebanon",[276,395]),
 ("IL","이스라엘","Israel",[263,422]),("PS","팔레스타인","Palestine",[269,418]),
 ("KW","쿠웨이트","Kuwait",[393,443]),("BH","바레인","Bahrain",[402,458]),
 ("QA","카타르","Qatar",[406,469]),("SG","싱가포르","Singapore",[936,738]),
 ("BN","브루나이","Brunei",[1048,709]),("MV","몰디브","Maldives",[645,699])]:
 country(*args[:3],marker=args[3])

# Later, smaller regions take precedence so highlights never overlap neighbors.
occupied = np.zeros((height, width), dtype=bool)
for entry in reversed(entries):
    if entry["id"] in region_masks:
        raw = region_masks[entry["id"]]
        exclusive = raw & ~occupied
        entry["path"] = trace(exclusive)
        occupied |= raw

payload = {"width":width,"height":height,"countries":entries}
output = ROOT / "pages/continents/asia/data/countries.js"
output.write_text("// Generated artwork hit areas. See scripts/build-asia-regions.py.\nwindow.WorldTour = window.WorldTour || {};\nwindow.WorldTour.asia = window.WorldTour.asia || {};\nwindow.WorldTour.asia.countries = "+json.dumps(payload,ensure_ascii=False,indent=2)+";\n",encoding="utf-8")
print(f"Generated {len(entries)} country regions")
