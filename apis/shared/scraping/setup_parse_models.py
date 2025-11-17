def setup(path: str) -> None:
    """
    Download and setup parsing models.

    Args:
        path: Directory path to store the models.
    """
    from pathlib import Path
    from docling.utils.model_downloader import download_models

    # Convert string path to Path object and ensure the directory exists
    path_obj = Path(path)
    path_obj.mkdir(parents=True, exist_ok=True)

    download_models(
        output_dir=path_obj,
        with_smolvlm=True,
        with_easyocr=True,
    )
