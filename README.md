本项目基于artoolkit5-js进行封装，将AR识别功能放到后端，为了提升性能采用WebWork进行多线程处理请求。测试NFT数据数量为200个左右，识别大概1s左右（将NFT数据分别放在20个Work中，每个Work处理10个数据）。

在此基础上做了如下修改：
1. 修改ARToolKitJS.cpp，将PAGES_MAX最大设置为60。
2. 增加webassembly编辑参数-s ALLOW_MEMORY_GROWTH=1，将内存调整为可变内存。